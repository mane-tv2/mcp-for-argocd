import assert from 'node:assert/strict';
import { test } from 'node:test';
import { refreshSsoTokens } from './sso.js';

const makeJwt = (payload: Record<string, unknown>): string => {
  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url').replace(/=/g, '');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(payload)}.sig`;
};

test('refreshSsoTokens posts a refresh_token grant and parses the new tokens', async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody = '';
  const newExp = Math.floor(Date.now() / 1000) + 3600;
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
    capturedBody = String(init?.body ?? '');
    return new Response(
      JSON.stringify({
        id_token: makeJwt({ exp: newExp }),
        refresh_token: 'refresh-2',
        expires_in: 3600
      }),
      { status: 200 }
    );
  }) as typeof fetch;
  try {
    const tokens = await refreshSsoTokens({
      tokenEndpoint: 'https://idp.example.com/token',
      clientId: 'cli-client',
      refreshToken: 'refresh-1'
    });
    assert.match(capturedBody, /grant_type=refresh_token/);
    assert.match(capturedBody, /refresh_token=refresh-1/);
    assert.match(capturedBody, /client_id=cli-client/);
    assert.equal(tokens.refreshToken, 'refresh-2');
    assert.equal(tokens.expiresAt, newExp * 1000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('refreshSsoTokens keeps the old refresh token if a new one is not returned', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        id_token: makeJwt({ exp: Math.floor(Date.now() / 1000) + 600 }),
        expires_in: 600
      }),
      { status: 200 }
    )) as typeof fetch;
  try {
    const tokens = await refreshSsoTokens({
      tokenEndpoint: 'https://idp.example.com/token',
      clientId: 'cli-client',
      refreshToken: 'refresh-1'
    });
    assert.equal(tokens.refreshToken, 'refresh-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('refreshSsoTokens throws on a non-OK response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('nope', { status: 401, statusText: 'Unauthorized' })) as typeof fetch;
  try {
    await assert.rejects(
      refreshSsoTokens({
        tokenEndpoint: 'https://idp.example.com/token',
        clientId: 'cli-client',
        refreshToken: 'refresh-1'
      }),
      /Failed to refresh SSO token/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
