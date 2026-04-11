// Cognito auth configuration.
// Set these env vars at build time to enable cloud sync.
// Without them, the app runs in offline-only mode.

const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? "";
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID ?? "";
const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN ?? "";
const SYNC_API_URL = import.meta.env.VITE_SYNC_API_URL ?? "";

export const isCloudEnabled = !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);

export const cognitoConfig = {
  userPoolId: COGNITO_USER_POOL_ID,
  clientId: COGNITO_CLIENT_ID,
  domain: COGNITO_DOMAIN,
  syncApiUrl: SYNC_API_URL,
  redirectUri: "wayport://auth/callback",
  logoutUri: "wayport://auth/logout",
};

// --- Token management (stored via Rust backend) ---

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

let currentTokens: AuthTokens | null = null;

export function setTokens(tokens: AuthTokens | null) {
  currentTokens = tokens;
}

export function getTokens(): AuthTokens | null {
  return currentTokens;
}

export function isTokenExpired(): boolean {
  if (!currentTokens) return true;
  return Date.now() > currentTokens.expiresAt - 60_000; // 1min buffer
}

// --- Cognito OAuth helpers ---

export function buildLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: cognitoConfig.redirectUri,
  });
  return `https://${cognitoConfig.domain}/login?${params}`;
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri,
  });
  return `https://${cognitoConfig.domain}/logout?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<AuthTokens> {
  const resp = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: cognitoConfig.clientId,
      code,
      redirect_uri: cognitoConfig.redirectUri,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token exchange failed: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
  const resp = await fetch(`https://${cognitoConfig.domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: cognitoConfig.clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: refreshToken, // refresh token stays the same
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}
