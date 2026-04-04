import { DEFAULT_AFTER_LOGIN_PATH, buildLoginPageUrl, buildReturnToPath } from "./config.js";
import { fetchMe } from "./api.js";

function setActiveNav(navKey) {
  document.querySelectorAll("[data-nav], [data-shell-nav]").forEach((link) => {
    const key = link.getAttribute("data-nav") || link.getAttribute("data-shell-nav");
    link.classList.toggle("active", key === navKey);
  });
}

function getDisplayName(me) {
  return me?.display_name || me?.creator?.display_name || me?.email || "Signed in";
}

function getEmail(me) {
  return me?.email || me?.creator?.email || "Authenticated StreamSuites account";
}

function getRole(me) {
  return me?.role || "account";
}

function getTier(me) {
  return me?.effective_tier?.tier_label || me?.tier || "core";
}

function getAvatarUrl(me) {
  return me?.avatar_url || me?.creator?.avatar_url || me?.profile?.avatar_url || "";
}

function buildAvatarFallback(name) {
  const source = String(name || "").trim();
  return source ? source.slice(0, 1).toUpperCase() : "S";
}

async function logoutAndRedirect() {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch (_error) {
    // Continue the redirect even when logout request visibility is poor.
  }
  window.location.assign("/");
}

function closeOtherMenus(except = null) {
  document.querySelectorAll("[data-user-menu]").forEach((menu) => {
    if (menu === except) return;
    menu.hidden = true;
    const trigger = menu.parentElement?.querySelector("[data-user-trigger]");
    trigger?.classList.remove("is-open");
    trigger?.setAttribute("aria-expanded", "false");
  });
}

function renderSignedOutSlot(slot) {
  slot.innerHTML = "";
  if (window.location.pathname.startsWith("/login/")) {
    return;
  }
  const signIn = document.createElement("a");
  signIn.className = "ghost-button";
  signIn.href = buildLoginPageUrl(buildReturnToPath());
  signIn.textContent = "Sign in";
  slot.appendChild(signIn);
}

function renderSignedInSlot(slot, me) {
  slot.innerHTML = "";

  const widget = document.createElement("div");
  widget.className = "user-widget";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "user-trigger";
  trigger.setAttribute("data-user-trigger", "true");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");

  const avatar = document.createElement("span");
  avatar.className = "user-avatar";
  const avatarUrl = getAvatarUrl(me);
  if (avatarUrl) {
    const image = document.createElement("img");
    image.src = avatarUrl;
    image.alt = "";
    avatar.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "user-avatar-fallback";
    fallback.textContent = buildAvatarFallback(getDisplayName(me));
    avatar.appendChild(fallback);
  }

  const copy = document.createElement("span");
  copy.className = "user-copy";
  copy.innerHTML = `<span class="user-name">${getDisplayName(me)}</span><span class="user-meta">${getRole(me)} · ${getTier(me)}</span>`;

  trigger.append(avatar, copy);

  const menu = document.createElement("div");
  menu.className = "user-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("data-user-menu", "true");
  menu.innerHTML = `
    <div class="user-menu-header">
      <div class="user-menu-name">${getDisplayName(me)}</div>
      <div class="user-menu-email">${getEmail(me)}</div>
      <div class="user-menu-role">${getRole(me)} · ${getTier(me)}</div>
    </div>
    <div class="user-menu-links">
      <a class="user-menu-link" href="/dashboard/" role="menuitem">Open dashboard</a>
      <a class="user-menu-link" href="/reports/" role="menuitem">Open reports</a>
      <button class="user-menu-action is-danger" type="button" role="menuitem" data-auth-logout="true">Sign out</button>
    </div>
  `;

  trigger.addEventListener("click", () => {
    const nextOpen = menu.hidden;
    closeOtherMenus(nextOpen ? menu : null);
    menu.hidden = !nextOpen;
    trigger.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  });

  menu.querySelector("[data-auth-logout='true']")?.addEventListener("click", logoutAndRedirect);

  widget.append(trigger, menu);
  slot.appendChild(widget);
}

function renderAuthState(me) {
  document.querySelectorAll("[data-auth-slot], #auth-slot").forEach((slot) => {
    if (!(slot instanceof HTMLElement)) return;
    if (!me?.authenticated) {
      renderSignedOutSlot(slot);
      return;
    }
    renderSignedInSlot(slot, me);
  });
}

function bindGlobalAuthUi() {
  if (document.body.dataset.authUiBound === "true") return;
  document.body.dataset.authUiBound = "true";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const menu = target instanceof Element ? target.closest(".user-widget") : null;
    if (menu) return;
    closeOtherMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeOtherMenus();
  });
}

export async function initConsolePage({
  navKey,
  authRequired = false,
  developerRequired = false,
  statusTargetId = "page-status",
} = {}) {
  setActiveNav(navKey);
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  bindGlobalAuthUi();

  const me = await fetchMe();
  renderAuthState(me);

  const statusEl = document.getElementById(statusTargetId);
  if (authRequired && !me?.authenticated) {
    if (statusEl) statusEl.textContent = "Sign-in required. Redirecting to the StreamSuites login flow...";
    window.location.assign(buildLoginPageUrl(buildReturnToPath() || DEFAULT_AFTER_LOGIN_PATH));
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
