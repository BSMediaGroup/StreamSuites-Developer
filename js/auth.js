import { DEFAULT_AFTER_LOGIN_PATH, buildLoginPageUrl } from "./config.js";
import { fetchMe } from "./api.js";

function setActiveNav(navKey) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-nav") === navKey);
  });
}

function renderAuthState(me) {
  const authSlot = document.getElementById("auth-slot");
  if (!authSlot) return;
  if (!me?.authenticated) {
    authSlot.innerHTML = `<a class="ghost-button" href="${buildLoginPageUrl(window.location.pathname)}">Sign in</a>`;
    return;
  }
  authSlot.innerHTML = `<div class="status-chip"><strong>${me.display_name || me.creator?.display_name || "Signed in"}</strong><span>${me.role || "account"}</span></div>`;
}

export async function initConsolePage({ navKey, authRequired = false, developerRequired = false, statusTargetId = "page-status" } = {}) {
  setActiveNav(navKey);
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  const me = await fetchMe();
  renderAuthState(me);
  const statusEl = document.getElementById(statusTargetId);
  if (authRequired && !me?.authenticated) {
    if (statusEl) statusEl.textContent = "Sign-in required. Redirecting to the StreamSuites login flow...";
    window.location.assign(buildLoginPageUrl(window.location.pathname || DEFAULT_AFTER_LOGIN_PATH));
    return { me, blocked: true };
  }
  const developerCapable = Boolean(
    me?.authenticated &&
    (me?.role === "admin" ||
      me?.admin_access?.allowed ||
      me?.badge_state?.applicable?.some?.((item) => item?.key === "developer"))
  );
  if (developerRequired && !developerCapable) {
    if (statusEl) {
      statusEl.textContent = "This route requires a developer-capable StreamSuites account.";
      statusEl.classList.add("error");
    }
    return { me, blocked: true };
  }
  return { me, blocked: false, developerCapable };
}
