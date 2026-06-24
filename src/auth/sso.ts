import { createHash, randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { URL } from 'node:url';
import { logger } from '../logging/logging.js';

// Default local port for the temporary OAuth2 callback server. Matches the
// ArgoCD CLI's `--sso-port` default so the redirect URI registered with the
// identity provider is the same one operators already allow-list.
export const DEFAULT_SSO_PORT = 8085;

// Default OIDC scopes requested during login. `offline_access` is required to
// receive a refresh token so the session can be renewed without re-prompting
// the user. The remaining scopes mirror the ArgoCD CLI defaults.
const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'groups'];

// ArgoCD's built-in Dex CLI client id, used when the instance authenticates via
// Dex rather than a directly configured external OIDC provider.
const DEX_CLI_CLIENT_ID = 'argo-cd-cli';

// Result of an OAuth2 token exchange / refresh.
export type SsoTokens = {
  idToken: string;
  refreshToken: string;
  // Absolute expiry (epoch ms) of the id token, derived from its `exp` claim
  // when present, otherwise from the response `expires_in`.
  expiresAt: number;
};

// Resolved OIDC configuration needed to drive the login flow.
export type OidcConfig = {
  issuer: string;
  clientId: string;
  scopes: string[];
};

// OIDC discovery document subset we depend on.
export type OidcEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
};

export type SsoLoginOptions = {
  baseUrl: string;
  ssoPort?: number;
  launchBrowser?: boolean;
};

// Shape of the relevant fields from GET {baseUrl}/api/v1/settings.
type ArgoCdSettings = {
  oidcConfig?: {
    issuer?: string;
    clientID?: string;
    cliClientID?: string;
    scopes?: string[];
  };
  dexConfig?: {
    connectors?: unknown[];
  };
};

// Query the ArgoCD instance for its OIDC configuration. ArgoCD exposes either a
// directly configured external provider (`oidcConfig`) or a bundled Dex
// instance (`dexConfig`); for the latter the issuer is ArgoCD's own /api/dex
// endpoint and the CLI client id is used.
export const fetchArgoCdOidcConfig = async (baseUrl: string): Promise<OidcConfig> => {
  const settingsUrl = new URL('/api/v1/settings', baseUrl).toString();
  const response = await fetch(settingsUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ArgoCD settings from ${settingsUrl}: ${response.status} ${response.statusText}`
    );
  }
  const settings = (await response.json()) as ArgoCdSettings;

  if (settings.oidcConfig?.issuer) {
    const oidc = settings.oidcConfig;
    const clientId = oidc.cliClientID || oidc.clientID;
    if (!clientId) {
      throw new Error('ArgoCD oidcConfig is missing a clientID/cliClientID');
    }
    return {
      issuer: oidc.issuer!,
      clientId,
      scopes: withOfflineAccess(
        oidc.scopes && oidc.scopes.length > 0 ? oidc.scopes : DEFAULT_SCOPES
      )
    };
  }

  if (settings.dexConfig?.connectors && settings.dexConfig.connectors.length > 0) {
    return {
      issuer: new URL('/api/dex', baseUrl).toString(),
      clientId: DEX_CLI_CLIENT_ID,
      scopes: withOfflineAccess(DEFAULT_SCOPES)
    };
  }

  throw new Error(
    `ArgoCD instance at ${baseUrl} does not have SSO (OIDC or Dex) configured. ` +
      'Use API-token authentication instead.'
  );
};

// Resolve the authorization and token endpoints via the OIDC discovery
// document at {issuer}/.well-known/openid-configuration.
export const discoverOidcEndpoints = async (issuer: string): Promise<OidcEndpoints> => {
  const discoveryUrl = new URL(
    '.well-known/openid-configuration',
    issuer.endsWith('/') ? issuer : `${issuer}/`
  ).toString();
  const response = await fetch(discoveryUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch OIDC discovery document from ${discoveryUrl}: ${response.status} ${response.statusText}`
    );
  }
  const doc = (await response.json()) as {
    authorization_endpoint?: string;
    token_endpoint?: string;
  };
  if (!doc.authorization_endpoint || !doc.token_endpoint) {
    throw new Error(
      `OIDC discovery document at ${discoveryUrl} is missing authorization_endpoint or token_endpoint`
    );
  }
  return {
    authorizationEndpoint: doc.authorization_endpoint,
    tokenEndpoint: doc.token_endpoint
  };
};

// Generate a PKCE (RFC 7636) verifier/challenge pair using the S256 method.
export const generatePkce = (): { verifier: string; challenge: string } => {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

// Generate an OAuth2 state nonce. Per RFC 6749 §10.10 it must be unguessable;
// 32 random bytes provides 256 bits of entropy.
export const generateState = (): string => base64UrlEncode(randomBytes(32));

// Run the full OAuth2 authorization-code-with-PKCE login flow: start a local
// callback server, open the browser to the IdP, and exchange the returned code
// for tokens. Returns the id token (used as the ArgoCD bearer token) plus the
// refresh token for later renewal.
export const performSsoLogin = async (options: SsoLoginOptions): Promise<SsoTokens> => {
  const { baseUrl } = options;
  const ssoPort = options.ssoPort ?? DEFAULT_SSO_PORT;
  const launchBrowser = options.launchBrowser ?? true;

  const oidcConfig = await fetchArgoCdOidcConfig(baseUrl);
  const endpoints = await discoverOidcEndpoints(oidcConfig.issuer);
  const { verifier, challenge } = generatePkce();
  const state = generateState();
  const redirectUri = `http://localhost:${ssoPort}/auth/callback`;

  const authUrl = new URL(endpoints.authorizationEndpoint);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', oidcConfig.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', oidcConfig.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');

  const code = await waitForAuthorizationCode(ssoPort, state, authUrl.toString(), launchBrowser);

  return exchangeCodeForTokens({
    tokenEndpoint: endpoints.tokenEndpoint,
    clientId: oidcConfig.clientId,
    code,
    redirectUri,
    codeVerifier: verifier
  });
};

// Exchange an OIDC refresh token for a fresh id token. Used by the session to
// renew credentials without user interaction.
export const refreshSsoTokens = async (params: {
  tokenEndpoint: string;
  clientId: string;
  refreshToken: string;
}): Promise<SsoTokens> => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId
  });
  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`Failed to refresh SSO token: ${response.status} ${response.statusText}`);
  }
  return parseTokenResponse(await response.json(), params.refreshToken);
};

// Start a one-shot HTTP server on localhost:<port>, open the browser to the
// authorization URL, and resolve with the authorization code once the IdP
// redirects back to /auth/callback. The server only ever binds to localhost.
const waitForAuthorizationCode = (
  ssoPort: number,
  expectedState: string,
  authUrl: string,
  launchBrowser: boolean
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const requestUrl = new URL(req.url ?? '', `http://localhost:${ssoPort}`);
      if (requestUrl.pathname !== '/auth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const error = requestUrl.searchParams.get('error');
      if (error) {
        const description = requestUrl.searchParams.get('error_description') ?? '';
        respondAndClose(
          res,
          400,
          `Authentication failed: ${escapeHtml(error)} ${escapeHtml(description)}`
        );
        finish(new Error(`SSO authentication failed: ${error} ${description}`.trim()));
        return;
      }

      const state = requestUrl.searchParams.get('state');
      if (state !== expectedState) {
        respondAndClose(res, 400, 'Authentication failed: invalid state nonce.');
        finish(new Error('SSO authentication failed: state nonce mismatch'));
        return;
      }

      const code = requestUrl.searchParams.get('code');
      if (!code) {
        respondAndClose(res, 400, 'Authentication failed: no authorization code in response.');
        finish(new Error('SSO authentication failed: no authorization code returned'));
        return;
      }

      respondAndClose(
        res,
        200,
        'Authentication successful! You can now return to your terminal. This window can be closed.'
      );
      finish(null, code);
    });

    let settled = false;
    const finish = (err: Error | null, code?: string) => {
      if (settled) return;
      settled = true;
      server.close();
      if (err) reject(err);
      else resolve(code as string);
    };

    server.on('error', (err) => finish(err));

    server.listen(ssoPort, 'localhost', () => {
      if (launchBrowser) {
        logger.info('Opening system default browser for ArgoCD SSO authentication');
        openBrowser(authUrl);
      } else {
        logger.info(`To authenticate, open the following URL in your browser:\n${authUrl}`);
      }
    });
  });
};

const exchangeCodeForTokens = async (params: {
  tokenEndpoint: string;
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<SsoTokens> => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier
  });
  const response = await fetch(params.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(
      `Failed to exchange authorization code for tokens: ${response.status} ${response.statusText}`
    );
  }
  return parseTokenResponse(await response.json());
};

// Normalise an OAuth2 token endpoint response into SsoTokens. `fallbackRefresh`
// is used when the provider omits a new refresh token on renewal (allowed by
// the spec — the previous refresh token then remains valid).
export const parseTokenResponse = (raw: unknown, fallbackRefresh = ''): SsoTokens => {
  const data = raw as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.id_token) {
    throw new Error('Token response did not contain an id_token');
  }
  const refreshToken = data.refresh_token ?? fallbackRefresh;
  if (!refreshToken) {
    throw new Error(
      'Token response did not contain a refresh_token. Ensure the offline_access scope is permitted.'
    );
  }
  return {
    idToken: data.id_token,
    refreshToken,
    expiresAt: resolveExpiry(data.id_token, data.expires_in)
  };
};

// Determine the absolute expiry of the id token. Prefer the JWT `exp` claim
// (authoritative for the bearer token); fall back to `expires_in` seconds.
const resolveExpiry = (idToken: string, expiresIn?: number): number => {
  const claimExp = decodeJwtExp(idToken);
  if (claimExp !== undefined) {
    return claimExp * 1000;
  }
  if (expiresIn !== undefined) {
    return Date.now() + expiresIn * 1000;
  }
  // Conservative default if neither is present: treat as already due for refresh.
  return Date.now();
};

// Decode (without verifying) the `exp` claim from a JWT. Verification is not
// needed here: the token is validated by the ArgoCD API server on use; we only
// read `exp` to schedule refreshes.
export const decodeJwtExp = (jwt: string): number | undefined => {
  const parts = jwt.split('.');
  if (parts.length !== 3) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp : undefined;
  } catch {
    return undefined;
  }
};

const withOfflineAccess = (scopes: string[]): string[] =>
  scopes.includes('offline_access') ? scopes : [...scopes, 'offline_access'];

const base64UrlEncode = (buffer: Buffer): string =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const respondAndClose = (res: ServerResponse, status: number, message: string): void => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(
    `<!doctype html><html><head><meta charset="utf-8"><title>ArgoCD MCP</title></head>` +
      `<body style="font-family:sans-serif;text-align:center;margin-top:60px">` +
      `<p>${message}</p></body></html>`
  );
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Open a URL in the operating system's default browser without adding an
// external dependency.
const openBrowser = (url: string): void => {
  let command: string;
  let args: string[];
  switch (process.platform) {
    case 'darwin':
      command = 'open';
      args = [url];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', '', url];
      break;
    default:
      command = 'xdg-open';
      args = [url];
      break;
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', (err) => {
      logger.warn(`Failed to open browser automatically: ${err.message}. URL: ${url}`);
    });
    child.unref();
  } catch (err) {
    logger.warn(
      `Failed to open browser automatically: ${err instanceof Error ? err.message : String(err)}. URL: ${url}`
    );
  }
};
