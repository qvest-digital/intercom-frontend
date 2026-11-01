/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** Turns the Keycloak login flow on. Off unless "true"/"1"/"yes"/"on". */
  readonly VITE_OIDC_ENABLED?: string;
  /** Realm issuer, e.g. https://keycloak.example.com/realms/myrealm */
  readonly VITE_OIDC_AUTHORITY?: string;
  /** Public client id registered in the realm. */
  readonly VITE_OIDC_CLIENT_ID?: string;
  /** Defaults to window.location.origin; must match a client redirect URI. */
  readonly VITE_OIDC_REDIRECT_URI?: string;
  /** Defaults to "openid profile email". */
  readonly VITE_OIDC_SCOPE?: string;
  /** Sends discovery and token requests through the page's own origin. */
  readonly VITE_OIDC_SAME_ORIGIN?: string;
}
