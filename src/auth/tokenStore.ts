import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { TokenRegistry } from '../server/tokenRegistry.js';
import { logger } from '../logging/logging.js';
import { SsoTokens } from './sso.js';

// On-disk cache of SSO tokens, keyed by (normalized) ArgoCD base URL. Persisting
// the id/refresh tokens lets the server reuse a previous session across
// restarts — refreshing silently with the refresh token — so the interactive
// browser login is only needed when there is no usable token at all.
//
// The tokens are secrets, so the file is created with 0600 permissions (owner
// read/write only), mirroring how the ArgoCD CLI stores its token in
// ~/.config/argocd/config.

type TokenCacheFile = Record<string, SsoTokens>;

// Resolve the cache file path. Honours an explicit override, then
// XDG_CONFIG_HOME, then ~/.config.
const cachePath = (): string => {
  const override = process.env.ARGOCD_MCP_SSO_CACHE?.trim();
  if (override) return override;
  const configHome = process.env.XDG_CONFIG_HOME?.trim() || join(homedir(), '.config');
  return join(configHome, 'argocd-mcp', 'sso-tokens.json');
};

const readCacheFile = (): TokenCacheFile => {
  try {
    const raw = readFileSync(cachePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as TokenCacheFile) : {};
  } catch {
    // Missing or unreadable/corrupt cache is non-fatal: treat as empty so the
    // caller falls back to a fresh login.
    return {};
  }
};

// Load cached tokens for the given base URL, if any.
export const loadCachedTokens = (baseUrl: string): SsoTokens | undefined => {
  const entry = readCacheFile()[TokenRegistry.normalize(baseUrl)];
  if (!entry || !entry.idToken || !entry.refreshToken) return undefined;
  return entry;
};

// Persist tokens for the given base URL, merging with any existing entries.
export const saveCachedTokens = (baseUrl: string, tokens: SsoTokens): void => {
  const path = cachePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    const file = readCacheFile();
    file[TokenRegistry.normalize(baseUrl)] = tokens;
    writeFileSync(path, JSON.stringify(file, null, 2), { mode: 0o600 });
    // Ensure permissions are tightened even if the file already existed.
    chmodSync(path, 0o600);
  } catch (error) {
    // A failure to cache is non-fatal — the session still works in memory.
    logger.warn(
      `Failed to write ArgoCD SSO token cache at ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
