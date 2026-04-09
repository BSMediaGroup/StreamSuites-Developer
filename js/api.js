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

async function fetchSessionSummary() {
  return fetchJson("/auth/session", { method: "GET" }).catch(() => null);
}

export async function fetchMe() {
  const me = await fetchJson("/api/me", { method: "GET" }).catch(() => ({ authenticated: false }));
  if (!me?.authenticated) {
    return { authenticated: false };
  }

  const needsSessionMerge =
    !me?.email ||
    !me?.display_name ||
    !me?.user_code;

  if (!needsSessionMerge) {
    return me;
  }

  const session = await fetchSessionSummary();
  if (!session || typeof session !== "object") {
    return me;
  }

  return {
    ...me,
    session,
    email:
      me.email ||
      session.email ||
      session.user_email ||
      session.user?.email ||
      session.user?.user_email ||
      session.user?.primary_email ||
      null,
    display_name:
      me.display_name ||
      session.display_name ||
      session.name ||
      session.user?.display_name ||
      session.user?.name ||
      null,
    user_code:
      me.user_code ||
      session.user_code ||
      session.user?.user_code ||
      null,
    role:
      me.role ||
      session.role ||
      session.user?.role ||
      session.user?.access_class ||
      null,
    tier:
      me.tier ||
      session.tier ||
      session.user?.tier ||
      session.user?.effective_tier?.tier ||
      null,
  };
}

export function setVoteToken(token) {
  if (typeof token === "string" && token) {
    window.localStorage.setItem(VOTE_TOKEN_STORAGE_KEY, token);
  }
}
