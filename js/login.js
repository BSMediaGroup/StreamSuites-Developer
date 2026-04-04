import { DEFAULT_AFTER_LOGIN_PATH } from "./config.js";

const statusEl = document.getElementById("login-status");
const formEl = document.getElementById("password-login-form");
const providerButtons = document.querySelectorAll("[data-provider]");
const accessGateEl = document.getElementById("login-access-gate");
const accessMessageEl = document.getElementById("login-access-message");
const accessToggleEl = document.getElementById("login-access-toggle");
const accessFormEl = document.getElementById("login-access-form");
const accessCodeEl = document.getElementById("login-access-code");
const accessSubmitEl = document.getElementById("login-access-submit");
const accessFeedbackEl = document.getElementById("login-access-feedback");
const returnTo =
  new URLSearchParams(window.location.search).get("return_to") ||
  new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();

let accessState = {
  gateActive: false,
  message: "",
  bypassEnabled: false,
  bypassUnlocked: false,
};

function providerPath(provider) {
  if (provider === "x") return "/auth/x/start";
  if (provider === "twitch") return "/oauth/twitch/start";
  return `/auth/login/${provider}`;
}

function setFeedback(message, tone = "") {
  if (!accessFeedbackEl) return;
  const text = String(message || "").trim();
  accessFeedbackEl.hidden = !text;
  accessFeedbackEl.textContent = text;
  accessFeedbackEl.dataset.tone = tone;
}

function syncAccessUi() {
  if (!accessGateEl) return;
  accessGateEl.hidden = !accessState.gateActive;
  if (accessMessageEl) {
    accessMessageEl.textContent = accessState.gateActive ? accessState.message : "";
  }
  if (accessToggleEl) {
    accessToggleEl.hidden = !(accessState.gateActive && accessState.bypassEnabled && !accessState.bypassUnlocked);
    accessToggleEl.textContent = accessState.bypassUnlocked ? "Unlocked" : "Use bypass code";
  }
  if (accessFormEl) {
    const open = accessToggleEl?.getAttribute("aria-expanded") === "true";
    accessFormEl.hidden = !(open && accessState.gateActive && accessState.bypassEnabled && !accessState.bypassUnlocked);
  }
}

function normalizeAccessState(payload) {
  const rawMode = typeof payload?.mode === "string" ? payload.mode.trim().toLowerCase() : "";
  const gateActive = rawMode === "maintenance" || rawMode === "development";
  return {
    gateActive,
    message:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : gateActive
          ? "Authentication is temporarily limited."
          : "",
    bypassEnabled: gateActive && payload?.bypass_enabled === true,
    bypassUnlocked: false,
    unlockExpiresAt: "",
  };
}

async function loadAccessState() {
  try {
    const response = await fetch("/auth/access-state", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`access-state-${response.status}`);
    const payload = await response.json();
    accessState = normalizeAccessState(payload);
  } catch (_error) {
    accessState = { gateActive: false, message: "", bypassEnabled: false, bypassUnlocked: false };
  }
  syncAccessUi();
}

async function unlockAccessGate(code) {
  const response = await fetch("/auth/debug/unlock", {
    method: "POST",
    credentials: "include",
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
  accessState = {
    ...normalizeAccessState({
      mode: payload?.mode,
      message: payload?.message,
      bypass_enabled: true,
    }),
    bypassUnlocked: true,
    unlockExpiresAt: payload?.expires_at || "",
  };
  syncAccessUi();
}

async function ensureAccessAvailable() {
  if (!accessState.gateActive || accessState.bypassUnlocked) return true;
  if (accessState.bypassEnabled) {
    accessToggleEl?.setAttribute("aria-expanded", "true");
    syncAccessUi();
    accessCodeEl?.focus();
    setFeedback("Enter the bypass code to continue.", "error");
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
  const expanded = accessToggleEl.getAttribute("aria-expanded") === "true";
  accessToggleEl.setAttribute("aria-expanded", expanded ? "false" : "true");
  setFeedback("", "");
  syncAccessUi();
});

accessFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = accessCodeEl?.value.trim();
  if (!code) {
    setFeedback("Enter the bypass code.", "error");
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
    accessToggleEl?.setAttribute("aria-expanded", "false");
    syncAccessUi();
    setFeedback("Access unlocked. You can continue with sign in.", "success");
  } catch (error) {
    const message =
      error?.status === 403
        ? "Invalid bypass code."
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
  try {
    const response = await fetch("/auth/login/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        surface: "creator",
      }),
    });
    if (![200, 302, 303, 307, 308].includes(response.status) && response.type !== "opaqueredirect") {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || payload?.message || "Password login failed");
    }
    window.location.assign(returnTo);
  } catch (error) {
    statusEl.textContent = error.message;
    statusEl.className = "status-line error";
  }
});

await loadAccessState();
statusEl.textContent = "Choose a sign-in method.";
