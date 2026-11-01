import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createUserManager,
  readReturnTo,
  readOidcConfig,
  sameOriginSettings,
} from "./oidc-settings";

const AUTHORITY = "https://keycloak.example.com/realms/dmf";

const configured = (overrides: Record<string, unknown> = {}) => ({
  VITE_OIDC_ENABLED: "true",
  VITE_OIDC_AUTHORITY: AUTHORITY,
  VITE_OIDC_CLIENT_ID: "intercom",
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readOidcConfig", () => {
  it("is disabled when the flag is absent", () => {
    expect(readOidcConfig({}).enabled).toBe(false);
  });

  it.each(["true", "TRUE", "1", "yes", "on"])("treats %s as on", (value) => {
    expect(
      readOidcConfig(configured({ VITE_OIDC_ENABLED: value })).enabled
    ).toBe(true);
  });

  it.each(["false", "0", "no", ""])("treats %s as off", (value) => {
    expect(
      readOidcConfig(configured({ VITE_OIDC_ENABLED: value })).enabled
    ).toBe(false);
  });

  it("stays disabled and complains when the flag is on but config is missing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(readOidcConfig({ VITE_OIDC_ENABLED: "true" }).enabled).toBe(false);
    expect(
      readOidcConfig({
        VITE_OIDC_ENABLED: "true",
        VITE_OIDC_AUTHORITY: AUTHORITY,
      }).enabled
    ).toBe(false);
    expect(error).toHaveBeenCalled();
  });

  it("strips a trailing slash from the authority", () => {
    expect(
      readOidcConfig(configured({ VITE_OIDC_AUTHORITY: `${AUTHORITY}/` }))
        .authority
    ).toBe(AUTHORITY);
  });

  it("defaults the redirect URI to the browser origin", () => {
    expect(readOidcConfig(configured()).redirectUri).toBe(
      window.location.origin
    );
  });

  it("honours an explicit redirect URI and scope", () => {
    const config = readOidcConfig(
      configured({
        VITE_OIDC_REDIRECT_URI: "http://localhost:5173",
        VITE_OIDC_SCOPE: "openid",
      })
    );
    expect(config.redirectUri).toBe("http://localhost:5173");
    expect(config.scope).toBe("openid");
  });

  it("defaults the scope to openid profile email", () => {
    expect(readOidcConfig(configured()).scope).toBe("openid profile email");
  });
});

describe("same-origin realm requests", () => {
  it("is off unless asked for", () => {
    expect(readOidcConfig(configured()).sameOrigin).toBe(false);
    expect(
      readOidcConfig(configured({ VITE_OIDC_SAME_ORIGIN: "true" })).sameOrigin
    ).toBe(true);
  });

  // Keycloak refuses a cross-origin token request from an origin the client
  // does not list, so every fetch the app makes has to stay on its own origin.
  it("moves discovery, token, user info and revocation onto the origin", () => {
    expect(
      sameOriginSettings(`${AUTHORITY}/`, "https://app.example.com")
    ).toEqual({
      metadataUrl:
        "https://app.example.com/realms/dmf/.well-known/openid-configuration",
      metadataSeed: {
        token_endpoint:
          "https://app.example.com/realms/dmf/protocol/openid-connect/token",
        userinfo_endpoint:
          "https://app.example.com/realms/dmf/protocol/openid-connect/userinfo",
        revocation_endpoint:
          "https://app.example.com/realms/dmf/protocol/openid-connect/revoke",
      },
    });
  });

  // The issuer and the login page have to stay the realm's own.
  it("keeps the authority on the realm", () => {
    const { settings } = createUserManager(
      readOidcConfig(configured({ VITE_OIDC_SAME_ORIGIN: "true" }))
    );
    expect(settings.authority).toBe(AUTHORITY);
    expect(settings.metadataUrl).toBe(
      `${window.location.origin}/realms/dmf/.well-known/openid-configuration`
    );
    expect(settings.metadataSeed?.token_endpoint).toBe(
      `${window.location.origin}/realms/dmf/protocol/openid-connect/token`
    );
  });

  it("talks to the realm directly when off", () => {
    const { settings } = createUserManager(readOidcConfig(configured()));
    expect(settings.metadataUrl).toBe(
      `${AUTHORITY}/.well-known/openid-configuration`
    );
    expect(settings.metadataSeed?.token_endpoint).toBeUndefined();
  });
});

describe("readReturnTo", () => {
  it("accepts a relative path", () => {
    expect(readReturnTo({ returnTo: "/calls?callId=1" })).toBe(
      "/calls?callId=1"
    );
  });

  it("rejects anything that could redirect off-site", () => {
    expect(readReturnTo({ returnTo: "//evil.example.com" })).toBeUndefined();
    expect(
      readReturnTo({ returnTo: "https://evil.example.com" })
    ).toBeUndefined();
    expect(readReturnTo({ returnTo: "calls" })).toBeUndefined();
  });

  it("ignores absent or malformed state", () => {
    expect(readReturnTo(undefined)).toBeUndefined();
    expect(readReturnTo(null)).toBeUndefined();
    expect(readReturnTo("/calls")).toBeUndefined();
    expect(readReturnTo({})).toBeUndefined();
    expect(readReturnTo({ returnTo: 42 })).toBeUndefined();
  });
});
