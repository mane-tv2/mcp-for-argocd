import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import {
  decodeJwtExp,
  fetchArgoCdOidcConfig,
  generatePkce,
  generateState,
  parseTokenResponse
} from './sso.js';

// Build an unsigned JWT with the given payload (header.payload.signature). Only
// the payload matters for these tests; signature is a placeholder.
const makeJwt = (payload: Record<string, unknown>): string => {
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url').replace(/=/g, '');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(payload)}.sig`;
};

const base64UrlOf = (input: string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

test('generatePkce produces a verifier and a matching S256 challenge', () => {
  const { verifier, challenge } = generatePkce();
  assert.ok(verifier.length >= 43, 'verifier should be at least 43 chars');
  assert.match(verifier, /^[A-Za-z0-9\-._~]+$/, 'verifier uses unreserved chars');
  const expected = base64UrlOf(createHash('sha256').update(verifier).digest().toString('binary'));
  // Recompute the challenge directly to confirm it is S256(verifier).
  const recomputed = createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  assert.equal(challenge, recomputed);
  assert.ok(expected.length > 0);
});

test('generateState returns unguessable, distinct nonces', () => {
  const a = generateState();
  const b = generateState();
  assert.notEqual(a, b);
  assert.ok(a.length >= 43);
});

test('decodeJwtExp reads the exp claim', () => {
  const jwt = makeJwt({ exp: 1893456000, sub: 'user' });
  assert.equal(decodeJwtExp(jwt), 1893456000);
});

test('decodeJwtExp returns undefined for malformed tokens', () => {
  assert.equal(decodeJwtExp('not-a-jwt'), undefined);
  assert.equal(decodeJwtExp('a.b'), undefined);
});

test('parseTokenResponse derives expiry from the id token exp claim', () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const idToken = makeJwt({ exp });
  const tokens = parseTokenResponse({
    id_token: idToken,
    refresh_token: 'refresh-1',
    expires_in: 60
  });
  assert.equal(tokens.idToken, idToken);
  assert.equal(tokens.refreshToken, 'refresh-1');
  assert.equal(tokens.expiresAt, exp * 1000);
});

test('parseTokenResponse falls back to expires_in when exp is absent', () => {
  const idToken = makeJwt({ sub: 'user' });
  const before = Date.now();
  const tokens = parseTokenResponse({ id_token: idToken, refresh_token: 'r', expires_in: 120 });
  assert.ok(tokens.expiresAt >= before + 120_000);
});

test('parseTokenResponse reuses the previous refresh token when none is returned', () => {
  const idToken = makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
  const tokens = parseTokenResponse({ id_token: idToken }, 'previous-refresh');
  assert.equal(tokens.refreshToken, 'previous-refresh');
});

test('parseTokenResponse throws when id_token is missing', () => {
  assert.throws(() => parseTokenResponse({ refresh_token: 'r' }), /id_token/);
});

test('parseTokenResponse throws when no refresh token is available', () => {
  const idToken = makeJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
  assert.throws(() => parseTokenResponse({ id_token: idToken }), /refresh_token/);
});

test('fetchArgoCdOidcConfig maps an external oidcConfig and adds offline_access', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        oidcConfig: {
          issuer: 'https://idp.example.com',
          clientID: 'web-client',
          cliClientID: 'cli-client',
          scopes: ['openid', 'email']
        }
      }),
      { status: 200 }
    )) as typeof fetch;
  try {
    const config = await fetchArgoCdOidcConfig('https://argocd.example.com');
    assert.equal(config.issuer, 'https://idp.example.com');
    assert.equal(config.clientId, 'cli-client');
    assert.deepEqual(config.scopes, ['openid', 'email', 'offline_access']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchArgoCdOidcConfig falls back to Dex when only dexConfig is present', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ dexConfig: { connectors: [{ type: 'github' }] } }), {
      status: 200
    })) as typeof fetch;
  try {
    const config = await fetchArgoCdOidcConfig('https://argocd.example.com');
    assert.equal(config.issuer, 'https://argocd.example.com/api/dex');
    assert.equal(config.clientId, 'argo-cd-cli');
    assert.ok(config.scopes.includes('offline_access'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchArgoCdOidcConfig throws when SSO is not configured', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({}), { status: 200 })) as typeof fetch;
  try {
    await assert.rejects(fetchArgoCdOidcConfig('https://argocd.example.com'), /does not have SSO/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
