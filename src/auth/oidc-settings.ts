import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

/**
 * Keycloak OIDC configuration, read from the VITE_OIDC_* build variables.
 *
 * Disabled unless VITE_OIDC_ENABLED is truthy, so builds that still rely on the
 * static VITE_BACKEND_API_KEY keep working untouched. See docs/oidc.md.
 */
const TRUTHY = ["1", "true", "yes", "on"];

const isTruthy = (value: unknown): boolean =>
  typeof value === "string" && TRUTHY.includes(value.trim().toLowerCase());

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export type TOidcConfig = {
  enabled: boolean;
  /** Realm issuer, e.g. https://keycloak.example.com/realms/myrealm */
  authority: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  /**
   * Reach the realm's discovery, token, user info and revocation endpoints
   * through the page's own origin, which must proxy the authority's path to
   * the realm. Keycloak answers a cross-origin call only from an origin listed
   * on the client, so this is what lets one client serve origins it does not
   * list.
   */
  sameOrigin: boolean;
};

export const readOidcConfig = (
  env: Record<string, unknown> = import.meta.env
): TOidcConfig => {
  const authority = stripTrailingSlash(
    typeof env.VITE_OIDC_AUTHORITY === "string" ? env.VITE_OIDC_AUTHORITY : ""
  );
  const clientId =
    typeof env.VITE_OIDC_CLIENT_ID === "string" ? env.VITE_OIDC_CLIENT_ID : "";

  // A build flagged on but not configured would render an app nobody can log
  // into, so treat incomplete configuration as disabled and say so.
  const requested = isTruthy(env.VITE_OIDC_ENABLED);
  const enabled = requested && Boolean(authority) && Boolean(clientId);

  if (requested && !enabled) {
    console.error(
      "VITE_OIDC_ENABLED is set but VITE_OIDC_AUTHORITY and/or VITE_OIDC_CLIENT_ID are missing — continuing with OIDC disabled"
    );
  }

  return {
    enabled,
    authority,
    clientId,
    redirectUri:
      typeof env.VITE_OIDC_REDIRECT_URI === "string" &&
      env.VITE_OIDC_REDIRECT_URI
        ? env.VITE_OIDC_REDIRECT_URI
        : window.location.origin,
    scope:
      typeof env.VITE_OIDC_SCOPE === "string" && env.VITE_OIDC_SCOPE
        ? env.VITE_OIDC_SCOPE
        : "openid profile email",
    sameOrigin: isTruthy(env.VITE_OIDC_SAME_ORIGIN),
  };
};

/**
 * The settings that move every request the app itself sends to the realm onto
 * `origin`, under the authority's path. The authorization and end-session
 * endpoints stay on the realm: the browser navigates to those, so no CORS
 * applies, and the login page has to be the realm's own.
 *
 * The endpoint paths are Keycloak's. A seed overrides the discovery document,
 * so the issuer still comes from the realm and tokens are checked against it.
 */
export const sameOriginSettings = (authority: string, origin: string) => {
  const base = `${origin}${new URL(authority).pathname.replace(/\/+$/, "")}`;
  const endpoint = (name: string) => `${base}/protocol/openid-connect/${name}`;
  return {
    metadataUrl: `${base}/.well-known/openid-configuration`,
    metadataSeed: {
      token_endpoint: endpoint("token"),
      userinfo_endpoint: endpoint("userinfo"),
      revocation_endpoint: endpoint("revoke"),
    },
  };
};

export const oidcConfig = readOidcConfig();

/** The location to come back to after login, round-tripped through OIDC state. */
export type TSigninState = { returnTo?: string };

export const currentLocation = (): string =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

/**
 * `state` crosses the wire and comes back as unknown — only accept a relative
 * path, never an absolute URL, so a tampered state cannot redirect off-site.
 */
export const readReturnTo = (state: unknown): string | undefined => {
  if (typeof state !== "object" || state === null) return undefined;
  const { returnTo } = state as TSigninState;
  if (typeof returnTo !== "string") return undefined;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return undefined;
  return returnTo;
};

export const createUserManager = (config: TOidcConfig): UserManager =>
  new UserManager({
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.redirectUri,
    scope: config.scope,
    // Authorization code + PKCE: the SPA is a public client and holds no secret.
    response_type: "code",
    automaticSilentRenew: true,
    // Survives a page reload; sessionStorage would drop the session per tab.
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    ...(config.sameOrigin
      ? sameOriginSettings(config.authority, window.location.origin)
      : {}),
  });

/**
 * Keycloak sends everyone back to redirect_uri (the app root), so restore the
 * location the user started from — share links carry their target in the path
 * and query string. Also drops ?code=/?state= so a reload cannot replay a spent
 * authorization code.
 */
export const onSigninCallback = (user: User | undefined): void => {
  const returnTo = readReturnTo(user?.state);
  window.history.replaceState(
    {},
    document.title,
    returnTo ?? window.location.pathname
  );
};
