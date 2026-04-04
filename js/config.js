export const DEFAULT_AFTER_LOGIN_PATH = "/dashboard/";
export const VOTE_TOKEN_STORAGE_KEY = "ss_console_vote_token";
export const AUTH_LOGIN_SURFACE = "console";
const AUTH_PATHS = new Set(["/login", "/login/", "/login-success", "/login-success/"]);

export function absoluteConsoleUrl(pathname = "/") {
  return new URL(pathname, window.location.origin).toString();
}

export function normalizeConsoleReturnTo(value, fallback = absoluteConsoleUrl(DEFAULT_AFTER_LOGIN_PATH)) {
  if (!value || typeof value !== "string") {
    return fallback;
  }
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return fallback;
    }
    if (AUTH_PATHS.has(parsed.pathname || "/")) {
      return fallback;
    }
    return parsed.toString();
  } catch (_error) {
    return fallback;
  }
}

export function buildReturnToPath() {
  return `${window.location.pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`;
}

export function buildLoginPageUrl(returnTo = buildReturnToPath()) {
  const url = new URL("/login/", window.location.origin);
  url.searchParams.set("return_to", normalizeConsoleReturnTo(returnTo));
  return url.toString();
}

export function buildLoginSuccessPageUrl(returnTo = buildReturnToPath()) {
  const url = new URL("/login-success/", window.location.origin);
  url.searchParams.set("return_to", normalizeConsoleReturnTo(returnTo));
  return url.toString();
}
