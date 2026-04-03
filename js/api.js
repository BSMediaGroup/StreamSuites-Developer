import { VOTE_TOKEN_STORAGE_KEY } from "./config.js";

function jsonHeaders(extra = {}) {
  const headers = { Accept: "application/json", ...extra };
  const voteToken = window.localStorage.getItem(VOTE_TOKEN_STORAGE_KEY);
  if (voteToken) headers["X-Vote-Token"] = voteToken;
  return headers;
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: jsonHeaders(options.headers || {}),
  });
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && (payload.error || payload.message)) ||
      (typeof payload === "string" ? payload : `Request failed (${response.status})`);
    throw new Error(String(message || "Request failed"));
  }
  return payload;
}

export async function fetchMe() {
  return fetchJson("/api/me", { method: "GET" }).catch(() => ({ authenticated: false }));
}

export function setVoteToken(token) {
  if (typeof token === "string" && token) {
    window.localStorage.setItem(VOTE_TOKEN_STORAGE_KEY, token);
  }
}
