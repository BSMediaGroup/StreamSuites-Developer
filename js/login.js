import { fetchMe } from "./api.js";
import { DEFAULT_AFTER_LOGIN_PATH } from "./config.js";

const statusEl = document.getElementById("login-status");
const formEl = document.getElementById("password-login-form");
const providerButtons = Array.from(document.querySelectorAll("[data-provider]"));
const accessGateEl = document.getElementById("login-access-gate");
const accessMessageEl = document.getElementById("login-access-message");
const accessToggleEl = document.getElementById("login-access-toggle");
const accessFormEl = document.getElementById("login-access-form");
const accessCodeEl = document.getElementById("login-access-code");
const accessSubmitEl = document.getElementById("login-access-submit");
const accessFeedbackEl = document.getElementById("login-access-feedback");
const ACCESS_STATE_URL = "/auth/access-state";
const DEBUG_UNLOCK_URL = "/auth/debug/unlock";
const LOGIN_PASSWORD_URL = "/auth/login/password";
const REQUEST_TIMEOUT_MS = 12000;
const AUTH_ACCESS_STORAGE_KEY = "streamsuites.console.authAccessGate";
const AUTH_ACCESS_CACHE_MS = 30000;
const AUTH_ACCESS_FALLBACK_MESSAGES = Object.freeze({
  normal: "Authentication is operating normally.",
  maintenance: "Authentication is temporarily unavailable while maintenance is in progress.",
  development: "Authentication is temporarily limited while development access mode is active.",
});
const returnTo = normalizeReturnTo(
  new URLSearchParams(window.location.search).get("return_to") ||
    new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString(),
);

let accessState = {
  available: true,
  mode: "normal",
  gateActive: false,
  message: "",
  bypassEnabled: false,
  bypassUnlocked: false,
  unlockExpiresAt: "",
};
let accessFormOpen = false;
let accessStateLoadedAt = 0;
let accessStatePromise = null;
let passwordBusy = false;

function providerPath(provider) {
  if (provider === "x") return "/auth/x/start";
  if (provider === "twitch") return "/oauth/twitch/start";
  return `/auth/login/${provider}`;
}

function normalizeReturnTo(value) {
  if (!value || typeof value !== "string") {
    return new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();
    }
    return parsed.toString();
  } catch (_error) {
    return new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();
  }
}

function fallbackAccessMessage(mode) {
  return AUTH_ACCESS_FALLBACK_MESSAGES[mode] || AUTH_ACCESS_FALLBACK_MESSAGES.normal;
}

function parseErrorMessage(payload, fallback) {
  const candidates = [
    payload?.error,
    payload?.message,
    payload?.data?.error,
    payload?.data?.message,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return fallback;
}

function clearAccessUnlockState() {
  try {
    window.sessionStorage.removeItem(AUTH_ACCESS_STORAGE_KEY);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function readAccessUnlockState() {
  try {
    const raw = window.sessionStorage.getItem(AUTH_ACCESS_STORAGE_KEY);
    if (!raw) return { active: false, expiresAt: "" };
    const parsed = JSON.parse(raw);
    const expiresAt = typeof parsed?.expiresAt === "string" ? parsed.expiresAt.trim() : "";
    const expiresAtMs = Date.parse(expiresAt);
    if (!expiresAt || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      clearAccessUnlockState();
      return { active: false, expiresAt: "" };
    }
    return { active: true, expiresAt };
  } catch (_error) {
    clearAccessUnlockState();
    return { active: false, expiresAt: "" };
  }
}

function persistAccessUnlockState(expiresAt) {
  if (typeof expiresAt !== "string" || !expiresAt.trim()) return;
  try {
    window.sessionStorage.setItem(
      AUTH_ACCESS_STORAGE_KEY,
      JSON.stringify({
        unlocked: true,
        expiresAt: expiresAt.trim(),
      }),
    );
  } catch (_error) {
    // Ignore storage failures.
  }
}

function setFeedback(message, tone = "") {
  if (!accessFeedbackEl) return;
  const text = String(message || "").trim();
  accessFeedbackEl.hidden = !text;
  accessFeedbackEl.textContent = text;
  accessFeedbackEl.dataset.tone = tone;
}

function isAccessBlocked() {
  return accessState.gateActive && !accessState.bypassUnlocked;
}

function setPasswordBusy(busy) {
  passwordBusy = Boolean(busy);
  const submitButton = formEl?.querySelector('button[type="submit"]');
  if (!(submitButton instanceof HTMLButtonElement)) return;
  submitButton.disabled = passwordBusy || isAccessBlocked();
  submitButton.textContent = passwordBusy ? "Signing in..." : "Continue with password";
}

function syncProviderAvailability() {
  providerButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = isAccessBlocked();
    button.classList.toggle("is-disabled", isAccessBlocked());
    button.setAttribute("aria-disabled", isAccessBlocked() ? "true" : "false");
  });
}

function setAccessFormOpen(open) {
  accessFormOpen = Boolean(open && accessState.gateActive && accessState.bypassEnabled && !accessState.bypassUnlocked);
  if (accessFormEl) {
    accessFormEl.hidden = !accessFormOpen;
  }
  if (accessToggleEl instanceof HTMLButtonElement) {
    accessToggleEl.setAttribute("aria-expanded", accessFormOpen ? "true" : "false");
    accessToggleEl.classList.toggle("is-active", accessFormOpen);
  }
  if (accessFormOpen && accessCodeEl instanceof HTMLInputElement) {
    window.setTimeout(() => accessCodeEl.focus(), 0);
  }
}

function syncAccessUi() {
  if (!accessGateEl) return;
  accessGateEl.hidden = !accessState.gateActive;
  accessGateEl.classList.toggle("is-unlocked", accessState.bypassUnlocked);
  if (accessMessageEl) {
    accessMessageEl.textContent = accessState.gateActive ? accessState.message : "";
  }
  if (accessToggleEl instanceof HTMLButtonElement) {
    accessToggleEl.hidden = !(accessState.gateActive && accessState.bypassEnabled);
  }
  if (!accessState.gateActive || !accessState.bypassEnabled || accessState.bypassUnlocked) {
    setAccessFormOpen(false);
  } else if (accessFormEl) {
    accessFormEl.hidden = !accessFormOpen;
  }
  syncProviderAvailability();
  setPasswordBusy(passwordBusy);
  if (accessState.gateActive && accessState.bypassUnlocked) {
    statusEl.textContent = "Access unlocked. Continue with sign in.";
    statusEl.className = "status-line success";
    return;
  }
  if (accessState.gateActive) {
    statusEl.textContent = accessState.bypassEnabled
      ? "Normal login is paused. Unlock access to continue."
      : "Normal login is paused right now.";
    statusEl.className = "status-line";
    return;
  }
  statusEl.textContent = "Choose a sign-in method.";
  statusEl.className = "status-line";
}

function normalizeAccessState(payload, available = true) {
  const rawMode = typeof payload?.mode === "string" ? payload.mode.trim().toLowerCase() : "";
  const mode = rawMode === "maintenance" || rawMode === "development" ? rawMode : "normal";
  const gateActive = mode !== "normal";
  const bypassEnabled = gateActive && payload?.bypass_enabled === true;
  const unlockState = bypassEnabled ? readAccessUnlockState() : { active: false, expiresAt: "" };
  if (!gateActive || !bypassEnabled) {
    clearAccessUnlockState();
  }
  return {
    available,
    mode,
    gateActive,
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : gateActive
          ? fallbackAccessMessage(mode)
          : fallbackAccessMessage("normal"),
    bypassEnabled,
    bypassUnlocked: bypassEnabled && unlockState.active,
    unlockExpiresAt: unlockState.expiresAt,
  };
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}

async function waitForSession(maxAttempts = 6) {
  for (let index = 0; index < maxAttempts; index += 1) {
    try {
      const me = await fetchMe();
      if (me?.authenticated) return true;
    } catch (_error) {
      // Continue retry loop.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150 + index * 120));
  }
  return false;
}

async function parseAccessStateResponse(response) {
  if (!response.ok) {
    throw new Error(`access-state-${response.status}`);
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    throw new Error("access-state-non-json");
  }
  return response.json();
}

async function loadAccessState(force = false) {
  const shouldUseCache =
    !force &&
    accessStateLoadedAt > 0 &&
    Date.now() - accessStateLoadedAt < AUTH_ACCESS_CACHE_MS;
  if (shouldUseCache) {
    syncAccessUi();
    return accessState;
  }
  if (accessStatePromise) return accessStatePromise;

  accessStatePromise = fetchWithTimeout(ACCESS_STATE_URL, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    redirect: "error",
    headers: { Accept: "application/json" },
  })
    .then((response) => parseAccessStateResponse(response))
    .then((payload) => {
      accessState = normalizeAccessState(payload, true);
      accessStateLoadedAt = Date.now();
      syncAccessUi();
      return accessState;
    })
    .catch(() => {
      accessState = normalizeAccessState(null, false);
      accessStateLoadedAt = Date.now();
      syncAccessUi();
      return accessState;
    })
    .finally(() => {
      accessStatePromise = null;
    });

  return accessStatePromise;
}

async function unlockAccessGate(code) {
  const response = await fetchWithTimeout(DEBUG_UNLOCK_URL, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error("unlock_failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  const expiresAt = typeof payload?.expires_at === "string" ? payload.expires_at.trim() : "";
  if (expiresAt) {
    persistAccessUnlockState(expiresAt);
  }
  accessState = {
    ...normalizeAccessState({
      mode: payload?.mode || accessState.mode,
      message: payload?.message || accessState.message,
      bypass_enabled: true,
    }),
    bypassUnlocked: true,
    unlockExpiresAt: expiresAt || accessState.unlockExpiresAt,
  };
  accessStateLoadedAt = Date.now();
  setAccessFormOpen(false);
  setFeedback("Access unlocked.", "success");
  syncAccessUi();
}

async function ensureAccessAvailable() {
  const nextAccessState = await loadAccessState(false);
  if (!nextAccessState.gateActive || nextAccessState.bypassUnlocked) return true;
  if (accessState.bypassEnabled) {
    setAccessFormOpen(true);
    setFeedback("Enter the access code to continue.", "error");
  } else if (statusEl) {
    statusEl.textContent = accessState.message || "Authentication is temporarily unavailable.";
    statusEl.className = "status-line error";
  }
  return false;
}

providerButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!(await ensureAccessAvailable())) return;
    const provider = button.getAttribute("data-provider");
    const url = new URL(providerPath(provider), window.location.origin);
    url.searchParams.set("surface", "creator");
    url.searchParams.set("return_to", returnTo);
    window.location.assign(url.toString());
  });
});

accessToggleEl?.addEventListener("click", () => {
  setFeedback("", "");
  setAccessFormOpen(!accessFormOpen);
});

accessFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = accessCodeEl?.value.trim();
  if (!code) {
    setFeedback("Enter the access code.", "error");
    return;
  }
  if (accessSubmitEl instanceof HTMLButtonElement) {
    accessSubmitEl.disabled = true;
    accessSubmitEl.textContent = "Unlocking...";
  }
  setFeedback("", "");
  try {
    await unlockAccessGate(code);
    if (accessCodeEl) accessCodeEl.value = "";
  } catch (error) {
    const message =
      error?.status === 403
        ? "Invalid access code."
        : error?.status === 429
          ? "Too many attempts. Please wait and try again."
          : "Unlock is unavailable right now.";
    setFeedback(message, "error");
  } finally {
    if (accessSubmitEl instanceof HTMLButtonElement) {
      accessSubmitEl.disabled = false;
      accessSubmitEl.textContent = "Unlock";
    }
  }
});

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!(await ensureAccessAvailable())) return;
  statusEl.textContent = "Signing in...";
  statusEl.className = "status-line";
  const formData = new FormData(formEl);
  setPasswordBusy(true);
  try {
    const response = await fetchWithTimeout(LOGIN_PASSWORD_URL, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      redirect: "manual",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        surface: "creator",
      }),
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      throw new Error("Invalid credentials.");
    }
    if (response.status === 429) {
      throw new Error("Too many login attempts. Please wait and try again.");
    }
    if (payload?.verification_required === true) {
      throw new Error("Check your email to verify your account before logging in.");
    }
    if (response.status >= 400) {
      throw new Error(parseErrorMessage(payload, "Unable to log in right now."));
    }
    const authenticated = await waitForSession();
    if (!authenticated) {
      statusEl.textContent = "Finishing login...";
    }
    window.location.assign(returnTo);
  } catch (error) {
    statusEl.textContent = error?.name === "AbortError" ? "Login timed out. Please try again." : error.message;
    statusEl.className = "status-line error";
  } finally {
    setPasswordBusy(false);
  }
});

await loadAccessState(true);
