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
  return me?.access_class || me?.role || "account";
}

function getTier(me) {
  return me?.effective_tier?.display_tier_label || me?.effective_tier?.tier_label || me?.tier || "core";
}

function getDisplayTier(me) {
  return String(getTier(me) || "").trim() || "Core";
}

function getIdentitySummary(me) {
  const role = String(getRole(me) || "").trim();
  const tier = String(getTier(me) || "").trim();
  if (!tier) return role || "account";
  if (role && role.toLowerCase() === tier.toLowerCase()) return role;
  return [role || "account", tier].join(" · ");
}

function getAvatarUrl(me) {
  return me?.avatar_url || me?.creator?.avatar_url || me?.profile?.avatar_url || "";
}

function buildAvatarFallback(name) {
  const source = String(name || "").trim();
  return source ? source.slice(0, 1).toUpperCase() : "S";
}

function getDeveloperConsoleAccess(me) {
  const access = me?.developer_console_access;
  return access && typeof access === "object"
    ? access
    : {
        allowed: false,
        route_allowed: false,
        route_public: false,
        public_routes: [],
        protected_routes: [],
      };
}

function getAdminDashboardAccess(me) {
  const access = me?.admin_access;
  return access && typeof access === "object" ? access : { allowed: false };
}

function getCreatorWorkspaceAccess(me) {
  const access = me?.creator_workspace_access;
  return access && typeof access === "object" ? access : { allowed: false };
}

function isCreatorDashboardAllowed(me) {
  return getCreatorWorkspaceAccess(me)?.allowed === true || me?.creator_capable === true;
}

function isAdminDashboardAllowed(me) {
  return getAdminDashboardAccess(me)?.allowed === true;
}

function getAccountOverviewRows(me) {
  return [
    { label: "Display name", value: getDisplayName(me) },
    { label: "Email", value: getEmail(me) },
    { label: "Account type", value: String(getRole(me) || "account") },
    { label: "Tier", value: getDisplayTier(me) },
  ];
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
  const developerAccess = getDeveloperConsoleAccess(me);
  const creatorAllowed = isCreatorDashboardAllowed(me);
  const adminAllowed = isAdminDashboardAllowed(me);

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
  copy.innerHTML = `<span class="user-name">${getDisplayName(me)}</span><span class="user-meta">${getIdentitySummary(me)}</span>`;

  trigger.append(avatar, copy);

  const menu = document.createElement("div");
  menu.className = "user-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("data-user-menu", "true");
  const header = document.createElement("div");
  header.className = "user-menu-header";
  header.innerHTML = `
    <div class="user-menu-name">${getDisplayName(me)}</div>
    <div class="user-menu-email">${getEmail(me)}</div>
    <div class="user-menu-role">${getIdentitySummary(me)}</div>
  `;

  const overview = document.createElement("div");
  overview.className = "user-menu-overview";
  for (const row of getAccountOverviewRows(me)) {
    const item = document.createElement("div");
    item.className = "user-menu-overview-row";
    item.innerHTML = `<span class="user-menu-overview-label">${row.label}</span><span class="user-menu-overview-value">${row.value}</span>`;
    overview.appendChild(item);
  }

  const links = document.createElement("div");
  links.className = "user-menu-links";
  links.innerHTML = developerAccess.allowed
    ? `<a class="user-menu-link" href="/dashboard/" role="menuitem">Open dashboard</a>
      <a class="user-menu-link" href="/reports/" role="menuitem">Open reports</a>`
    : `<a class="user-menu-link" href="/feedback/" role="menuitem">Open feedback</a>
      <a class="user-menu-link" href="/beta/apply/" role="menuitem">Open beta apply</a>`;

  if (creatorAllowed) {
    links.insertAdjacentHTML(
      "beforeend",
      `<a class="user-menu-link" href="https://creator.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer">Creator Dashboard</a>`
    );
  }
  if (adminAllowed) {
    links.insertAdjacentHTML(
      "beforeend",
      `<a class="user-menu-link" href="https://admin.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer">Admin Dashboard</a>`
    );
  }
  links.insertAdjacentHTML(
    "beforeend",
    `<button class="user-menu-action is-danger" type="button" role="menuitem" data-auth-logout="true">Sign out</button>`
  );

  menu.append(header, overview, links);

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
  const developerAccess = getDeveloperConsoleAccess(me);
  const developerCapable = me?.authenticated && developerAccess.allowed === true;

  if (developerRequired && !developerCapable) {
    if (statusEl) {
      statusEl.textContent = "This route requires a developer-authorized StreamSuites account. Redirecting...";
      statusEl.classList.add("error");
    }
    window.setTimeout(() => {
      window.location.assign("/feedback/");
    }, 180);
    return { me, blocked: true };
  }

  return { me, blocked: false, developerCapable, developerAccess };
}

export function createInlineTurnstileController({
  panel,
  slot,
  status,
  configUrl = "/auth/turnstile/config",
} = {}) {
  const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const state = {
    enabled: false,
    sitekey: "",
    token: "",
    widgetId: null,
    configLoaded: false,
    configPromise: null,
    scriptPromise: null,
  };

  function setStatus(message, tone = "") {
    if (!(status instanceof HTMLElement)) return;
    status.textContent = String(message || "").trim();
    status.dataset.tone = tone;
  }

  async function loadConfig() {
    if (state.configLoaded) return state;
    if (state.configPromise) return state.configPromise;

    state.configPromise = fetch(configUrl, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`turnstile-config-${response.status}`);
        return response.json();
      })
      .then((payload) => {
        state.enabled =
          payload?.enabled === true && typeof payload?.sitekey === "string" && payload.sitekey.trim().length > 0;
        state.sitekey = state.enabled ? payload.sitekey.trim() : "";
        state.configLoaded = true;
        if (panel instanceof HTMLElement) {
          panel.hidden = !state.enabled;
        }
        if (state.enabled) {
          setStatus("Complete the security check to continue.");
        }
        return state;
      })
      .catch(() => {
        state.enabled = false;
        state.sitekey = "";
        state.configLoaded = true;
        if (panel instanceof HTMLElement) {
          panel.hidden = true;
        }
        return state;
      })
      .finally(() => {
        state.configPromise = null;
      });

    return state.configPromise;
  }

  async function loadScript() {
    if (window.turnstile?.render) return window.turnstile;
    if (state.scriptPromise) return state.scriptPromise;

    state.scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.turnstile), { once: true });
        existing.addEventListener("error", () => reject(new Error("turnstile-script-load-failed")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error("turnstile-script-load-failed"));
      document.head.appendChild(script);
    }).finally(() => {
      state.scriptPromise = null;
    });

    return state.scriptPromise;
  }

  async function init() {
    await loadConfig();
    if (!state.enabled || !(slot instanceof HTMLElement)) return false;
    if (state.widgetId !== null) return true;

    const turnstile = await loadScript();
    state.widgetId = turnstile.render(slot, {
      sitekey: state.sitekey,
      theme: "auto",
      callback(token) {
        state.token = String(token || "").trim();
        setStatus("Security check ready.", "success");
      },
      "expired-callback"() {
        state.token = "";
        setStatus("The security check expired. Complete it again.", "error");
      },
      "error-callback"() {
        state.token = "";
        setStatus("Security check failed to load. Refresh and try again.", "error");
      },
    });
    return true;
  }

  async function requireToken() {
    await init();
    if (!state.enabled) return "";
    if (state.token) return state.token;
    setStatus("Complete the security check to continue.", "error");
    return "";
  }

  function reset() {
    if (!state.enabled || state.widgetId === null || !window.turnstile?.reset) return;
    state.token = "";
    window.turnstile.reset(state.widgetId);
    setStatus("Complete the security check to continue.");
  }

  return {
    init,
    reset,
    requireToken,
    isEnabled() {
      return state.enabled;
    },
  };
}
