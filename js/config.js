export const DEFAULT_AFTER_LOGIN_PATH = "/dashboard/";
export const VOTE_TOKEN_STORAGE_KEY = "ss_console_vote_token";

export function absoluteConsoleUrl(pathname = "/") {
  return new URL(pathname, window.location.origin).toString();
}

export function buildReturnToPath() {
  return `${window.location.pathname || "/"}${window.location.search || ""}${window.location.hash || ""}`;
}

export function buildLoginPageUrl(returnTo = buildReturnToPath()) {
  const url = new URL("/login/", window.location.origin);
  url.searchParams.set("return_to", absoluteConsoleUrl(returnTo));
  return url.toString();
}
