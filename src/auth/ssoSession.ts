import { logger } from '../logging/logging.js';
import {
  discoverOidcEndpoints,
  fetchArgoCdOidcConfig,
  performSsoLogin,
  refreshSsoTokens,
  SsoLoginOptions,
  SsoTokens
} from './sso.js';
import { loadCachedTokens, saveCachedTokens } from './tokenStore.js';

// Renew the token this many milliseconds before its actual expiry so in-flight
// requests never race an expiring credential.
const REFRESH_THRESHOLD_MS = 60_000;

// Holds the SSO credentials for a single ArgoCD instance and keeps them valid
// while minimising interactive logins.
//
// Acquisition is cache-first and lazy:
//   1. Reuse the in-memory token if still valid.
//   2. Otherwise load a token persisted from a previous run.
//   3. If that token is expired, refresh it SILENTLY with the refresh token
//      (no browser).
//   4. Only when no usable token can be obtained that way is the interactive
//      browser login run — and only when a token is actually needed.
//
// Login is also deferred until after the stdio transport connects so the MCP
// initialize handshake is not blocked (a blocking login causes clients to
// report "-32000 connection closed").
export class SsoSession {
  private readonly options: SsoLoginOptions;
  private tokens: SsoTokens | null = null;
  private tokenEndpoint = '';
  private clientId = '';
  // Serialises acquisition so concurrent calls never open two browser windows.
  private acquireInFlight: Promise<boolean> | null = null;

  constructor(options: SsoLoginOptions) {
    this.options = options;
  }

  // Proactively acquire a token WITHOUT opening a browser (cache + silent
  // refresh only). Safe to call once after the transport connects so the first
  // tool call is fast when a cached token exists; never triggers an interactive
  // login on its own.
  public prime(): void {
    void this.ensureToken(false).catch((error) => {
      logger.warn(
        `ArgoCD SSO token priming failed: ${error instanceof Error ? error.message : String(error)}`
      );
    });
  }

  // Return a valid id token, acquiring one interactively only if no cached or
  // refreshable token is available. Bound so it can be passed directly as a
  // token provider.
  public getToken = async (): Promise<string> => {
    await this.ensureToken(true);
    if (!this.tokens) {
      throw new Error('ArgoCD SSO login did not produce a token');
    }
    return this.tokens.idToken;
  };

  // Ensure a valid token is available. When allowInteractive is false, the
  // browser login is skipped and the method returns false if no token could be
  // obtained silently.
  private async ensureToken(allowInteractive: boolean): Promise<boolean> {
    if (this.tokens && !this.isExpiring(this.tokens)) {
      return true;
    }
    if (this.acquireInFlight) {
      await this.acquireInFlight;
      if (this.tokens && !this.isExpiring(this.tokens)) {
        return true;
      }
    }
    this.acquireInFlight = this.acquire(allowInteractive);
    try {
      return await this.acquireInFlight;
    } finally {
      this.acquireInFlight = null;
    }
  }

  private async acquire(allowInteractive: boolean): Promise<boolean> {
    // Load a previously persisted token if we don't have one in memory yet.
    if (!this.tokens) {
      const cached = loadCachedTokens(this.options.baseUrl);
      if (cached) {
        this.tokens = cached;
        logger.info('Loaded cached ArgoCD SSO token');
      }
    }

    // A still-valid token needs nothing further.
    if (this.tokens && !this.isExpiring(this.tokens)) {
      return true;
    }

    // Try a silent refresh using the refresh token — no browser required.
    if (this.tokens?.refreshToken) {
      try {
        await this.resolveOidcMeta();
        await this.refresh();
        return true;
      } catch (error) {
        logger.warn(
          `ArgoCD SSO silent refresh failed, falling back to interactive login: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        this.tokens = null;
      }
    }

    if (!allowInteractive) {
      return false;
    }

    // Last resort: interactive browser login.
    await this.resolveOidcMeta();
    const tokens = await performSsoLogin(this.options);
    this.tokens = tokens;
    saveCachedTokens(this.options.baseUrl, tokens);
    logger.info('ArgoCD SSO login successful');
    return true;
  }

  // Resolve and memoise the token endpoint and client id needed for refresh and
  // interactive login.
  private async resolveOidcMeta(): Promise<void> {
    if (this.tokenEndpoint && this.clientId) return;
    const oidcConfig = await fetchArgoCdOidcConfig(this.options.baseUrl);
    const endpoints = await discoverOidcEndpoints(oidcConfig.issuer);
    this.tokenEndpoint = endpoints.tokenEndpoint;
    this.clientId = oidcConfig.clientId;
  }

  private async refresh(): Promise<void> {
    logger.info('Refreshing ArgoCD SSO token');
    const tokens = await refreshSsoTokens({
      tokenEndpoint: this.tokenEndpoint,
      clientId: this.clientId,
      refreshToken: this.tokens!.refreshToken
    });
    this.tokens = tokens;
    saveCachedTokens(this.options.baseUrl, tokens);
  }

  private isExpiring(tokens: SsoTokens): boolean {
    return Date.now() >= tokens.expiresAt - REFRESH_THRESHOLD_MS;
  }
}
