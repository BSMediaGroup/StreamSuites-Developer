import {
  AUTH_LOGIN_SURFACE,
  DEFAULT_AFTER_LOGIN_PATH,
  buildLoginPageUrl,
  normalizeConsoleReturnTo,
} from "./config.js";

const SESSION_URL = "/auth/session";
const SESSION_RETRY_DELAYS_MS = [180, 360, 720, 1280];
const AUTH_REASON_HEADERS = ["x-auth-reason", "x-streamsuites-auth-reason", "x-auth-status"];
const AUTH_REASON_ENUM_HEADERS = ["x-auth-reason-enum", "x-streamsuites-auth-reason-enum"];

const statusEl = document.getElementById("auth-success-status");
const nextLinkEl = document.getElementById("success-next-link");
const next = normalizeConsoleReturnTo(
  new URLSearchParams(window.location.search).get("return_to") ||
    new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString(),
);

if (nextLinkEl instanceof HTMLAnchorElement) {
  nextLinkEl.href = next;
}

function setStatus(message, tone = "") {
  if (!statusEl) return;
  statusEl.textContent = String(message || "").trim();
  statusEl.className = tone ? `status-line ${tone}` : "status-line";
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeReason(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("cookie_missing")) return "cookie_missing";
  return trimmed;
}

function resolveReason(payload, response) {
  if (payload && typeof payload === "object") {
    const candidate =
      payload.reason ||
      payload.error?.reason ||
      payload.status ||
      payload.error ||
      payload.message;
    const normalized = normalizeReason(candidate);
    if (normalized) return normalized;
  }
  const headerReason = AUTH_REASON_HEADERS.map((header) => response?.headers?.get(header)).find(Boolean);
  return normalizeReason(headerReason);
}

function resolveReasonEnum(payload, response) {
  if (payload && typeof payload === "object") {
    const candidate = payload.reason_enum || payload.error?.reason_enum;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toUpperCase();
    }
  }
  const headerReasonEnum = AUTH_REASON_ENUM_HEADERS.map((header) => response?.headers?.get(header)).find(Boolean);
  return typeof headerReasonEnum === "string" && headerReasonEnum.trim()
    ? headerReasonEnum.trim().toUpperCase()
    : "";
}

function isCookieMissing(response, payload) {
  if (!response || response.status !== 401) return false;
  if (resolveReasonEnum(payload, response) === "COOKIE_MISSING") return true;
  return resolveReason(payload, response) === "cookie_missing";
}

async function fetchSessionPayload() {
  const response = await fetch(SESSION_URL, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function confirmSession() {
  let lastResult = null;
  for (let attempt = 0; attempt <= SESSION_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      setStatus("Finalising session...");
      await wait(SESSION_RETRY_DELAYS_MS[attempt - 1]);
    }
    lastResult = await fetchSessionPayload();
    const { response, payload } = lastResult;
    const sessionValid =
      response.ok === true &&
      (payload?.ok === true || payload?.authenticated === true || payload?.session_valid === true);
    if (sessionValid) {
      return lastResult;
    }
    if (!isCookieMissing(response, payload)) {
      return lastResult;
    }
  }
  return lastResult;
}

async function finalizeAuth() {
  setStatus("Finalising session...");
  console.info("[Developer][Auth] session_confirm_request", {
    surface: AUTH_LOGIN_SURFACE,
    target: SESSION_URL,
    next,
  });
  try {
    const { response, payload } = await confirmSession();
    const sessionValid =
      response?.ok === true &&
      (payload?.ok === true || payload?.authenticated === true || payload?.session_valid === true);
    if (!sessionValid) {
      console.warn("[Developer][Auth] session_confirm_failed", {
        surface: AUTH_LOGIN_SURFACE,
        status: response?.status ?? 0,
        reason: resolveReason(payload, response) || null,
        reason_enum: resolveReasonEnum(payload, response) || null,
        next,
      });
      setStatus("Session confirmation failed. Returning to login...", "error");
      window.setTimeout(() => {
        window.location.assign(buildLoginPageUrl(next));
      }, 900);
      return;
    }
    console.info("[Developer][Auth] session_confirmed", {
      surface: AUTH_LOGIN_SURFACE,
      status: response.status,
      next,
    });
    setStatus("Session confirmed. Entering console...", "success");
    window.setTimeout(() => {
      window.location.assign(next);
    }, 250);
  } catch (error) {
    console.warn("[Developer][Auth] session_confirm_failed", {
      surface: AUTH_LOGIN_SURFACE,
      status: 0,
      reason: error?.name || "request_failed",
      next,
    });
    setStatus("Session confirmation failed. Returning to login...", "error");
    window.setTimeout(() => {
      window.location.assign(buildLoginPageUrl(next));
    }, 900);
  }
}

void finalizeAuth();
