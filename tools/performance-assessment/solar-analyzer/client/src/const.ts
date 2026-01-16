export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Log environment variables for debugging
if (typeof window !== 'undefined') {
  console.log("[Auth Config]", {
    oauthPortalUrl: import.meta.env.VITE_OAUTH_PORTAL_URL ? "✓ set" : "✗ missing",
    appId: import.meta.env.VITE_APP_ID ? "✓ set" : "✗ missing",
  });
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  
  if (!oauthPortalUrl) {
    console.error("VITE_OAUTH_PORTAL_URL environment variable is not set");
    throw new Error("OAuth portal URL is not configured");
  }
  
  if (!appId) {
    console.error("VITE_APP_ID environment variable is not set");
    throw new Error("App ID is not configured");
  }
  
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
