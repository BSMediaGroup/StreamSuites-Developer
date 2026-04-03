import { DEFAULT_AFTER_LOGIN_PATH } from "./config.js";

const statusEl = document.getElementById("login-status");
const formEl = document.getElementById("password-login-form");
const providerButtons = document.querySelectorAll("[data-provider]");
const returnTo = new URLSearchParams(window.location.search).get("return_to") || new URL(DEFAULT_AFTER_LOGIN_PATH, window.location.origin).toString();

function providerPath(provider) {
  if (provider === "x") return "/auth/x/start";
  if (provider === "twitch") return "/oauth/twitch/start";
  return `/auth/login/${provider}`;
}

providerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const provider = button.getAttribute("data-provider");
    const url = new URL(providerPath(provider), window.location.origin);
    url.searchParams.set("surface", "creator");
    url.searchParams.set("return_to", returnTo);
    window.location.assign(url.toString());
  });
});

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Signing in...";
  statusEl.className = "status-line";
  const formData = new FormData(formEl);
  try {
    const response = await fetch("/auth/login/password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password"), surface: "creator" }),
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
