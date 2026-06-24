import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { loadCachedTokens, saveCachedTokens } from './tokenStore.js';
import { SsoTokens } from './sso.js';

const withTempCache = (fn: () => void): void => {
  const dir = mkdtempSync(join(tmpdir(), 'argocd-mcp-cache-'));
  const previous = process.env.ARGOCD_MCP_SSO_CACHE;
  process.env.ARGOCD_MCP_SSO_CACHE = join(dir, 'sso-tokens.json');
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.ARGOCD_MCP_SSO_CACHE;
    else process.env.ARGOCD_MCP_SSO_CACHE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
};

const sampleTokens = (overrides: Partial<SsoTokens> = {}): SsoTokens => ({
  idToken: 'id-token',
  refreshToken: 'refresh-token',
  expiresAt: Date.now() + 3_600_000,
  ...overrides
});

test('loadCachedTokens returns undefined when nothing is cached', () => {
  withTempCache(() => {
    assert.equal(loadCachedTokens('https://argocd.example.com'), undefined);
  });
});

test('saveCachedTokens then loadCachedTokens round-trips the tokens', () => {
  withTempCache(() => {
    const tokens = sampleTokens();
    saveCachedTokens('https://argocd.example.com', tokens);
    const loaded = loadCachedTokens('https://argocd.example.com');
    assert.deepEqual(loaded, tokens);
  });
});

test('cached tokens are looked up by normalized base URL', () => {
  withTempCache(() => {
    const tokens = sampleTokens();
    saveCachedTokens('https://ArgoCD.Example.com/', tokens);
    // Different casing / trailing slash must still resolve to the same entry.
    const loaded = loadCachedTokens('https://argocd.example.com');
    assert.deepEqual(loaded, tokens);
  });
});

test('saving a second base URL does not clobber the first', () => {
  withTempCache(() => {
    const a = sampleTokens({ idToken: 'a' });
    const b = sampleTokens({ idToken: 'b' });
    saveCachedTokens('https://a.example.com', a);
    saveCachedTokens('https://b.example.com', b);
    assert.equal(loadCachedTokens('https://a.example.com')?.idToken, 'a');
    assert.equal(loadCachedTokens('https://b.example.com')?.idToken, 'b');
  });
});

test('the cache file is written with owner-only permissions', () => {
  withTempCache(() => {
    saveCachedTokens('https://argocd.example.com', sampleTokens());
    if (platform() === 'win32') return; // POSIX permission bits are not meaningful on Windows
    const mode = statSync(process.env.ARGOCD_MCP_SSO_CACHE as string).mode & 0o777;
    assert.equal(mode, 0o600);
  });
});
