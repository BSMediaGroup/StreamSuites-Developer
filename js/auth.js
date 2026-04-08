import { DEFAULT_AFTER_LOGIN_PATH, buildLoginPageUrl, buildReturnToPath } from "./config.js";
import { fetchMe } from "./api.js";

const SHELL_COLLAPSE_STORAGE_KEY = "ss_developer_sidebar_collapsed";
const SHELL_PAGE_CLASS = "developer-shell-page";

function setActiveNav(navKey) {
  document.querySelectorAll("[data-nav], [data-shell-nav], #app-nav li[data-view]").forEach((link) => {
    const key = link.getAttribute("data-nav") || link.getAttribute("data-shell-nav") || link.getAttribute("data-view");
    const isActive = key === navKey;
    link.classList.toggle("active", isActive);
    if (link.matches("#app-nav li[data-view]")) {
      link.setAttribute("aria-current", isActive ? "page" : "false");
    }
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

function getTierBadgeSrc(me) {
  switch (String(getDisplayTier(me) || "").trim().toUpperCase()) {
    case "GOLD":
      return "/assets/icons/tierbadge-gold.svg";
    case "PRO":
      return "/assets/icons/tierbadge-pro.svg";
    case "CORE":
    default:
      return "/assets/icons/tierbadge-core.svg";
  }
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
    trigger?.parentElement?.classList.remove("is-open");
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

function buildShellMenuItems({ developerAccess, creatorAllowed, adminAllowed }) {
  const items = [
    developerAccess.allowed
      ? `<a class="ss-user-menu-item" href="/dashboard/" role="menuitem"><span class="ss-user-menu-item-icon" data-icon="dashboard" aria-hidden="true"></span>Developer Dashboard</a>`
      : `<a class="ss-user-menu-item" href="/feedback/" role="menuitem"><span class="ss-user-menu-item-icon" data-icon="feedback" aria-hidden="true"></span>Open feedback</a>`,
    developerAccess.allowed
      ? `<a class="ss-user-menu-item" href="/reports/" role="menuitem"><span class="ss-user-menu-item-icon" data-icon="reports" aria-hidden="true"></span>Reports Hub</a>`
      : `<a class="ss-user-menu-item" href="/beta/apply/" role="menuitem"><span class="ss-user-menu-item-icon" data-icon="beta" aria-hidden="true"></span>Beta Apply</a>`,
    `<a class="ss-user-menu-item" href="/beta/" role="menuitem" target="_blank" rel="noreferrer"><span class="ss-user-menu-item-icon" data-icon="beta" aria-hidden="true"></span>Beta Program</a>`,
  ];

  if (creatorAllowed) {
    items.push(
      `<a class="ss-user-menu-item" href="https://creator.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer"><span class="ss-user-menu-item-icon" data-icon="creator" aria-hidden="true"></span>Creator Dashboard</a>`
    );
  }
  if (adminAllowed) {
    items.push(
      `<a class="ss-user-menu-item" href="https://admin.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer"><span class="ss-user-menu-item-icon" data-icon="admin" aria-hidden="true"></span>Admin Dashboard</a>`
    );
  }

  items.push(`<div class="ss-user-menu-divider" role="separator" aria-hidden="true"></div>`);
  items.push(
    `<button id="developer-auth-logout" type="button" class="ss-user-menu-item" role="menuitem" data-auth-logout="true"><span class="ss-user-menu-item-icon" data-icon="logout" aria-hidden="true"></span>Sign out</button>`
  );
  return items;
}

function buildStandaloneMenuItems({ developerAccess, creatorAllowed, adminAllowed }) {
  const items = [
    developerAccess.allowed
      ? `<a class="user-menu-link" href="/dashboard/" role="menuitem">Developer Dashboard</a>`
      : `<a class="user-menu-link" href="/feedback/" role="menuitem">Open feedback</a>`,
    developerAccess.allowed
      ? `<a class="user-menu-link" href="/reports/" role="menuitem">Reports Hub</a>`
      : `<a class="user-menu-link" href="/beta/apply/" role="menuitem">Beta Apply</a>`,
    `<a class="user-menu-link" href="/beta/" role="menuitem" target="_blank" rel="noreferrer">Beta Program</a>`,
  ];

  if (creatorAllowed) {
    items.push(`<a class="user-menu-link" href="https://creator.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer">Creator Dashboard</a>`);
  }
  if (adminAllowed) {
    items.push(`<a class="user-menu-link" href="https://admin.streamsuites.app/" role="menuitem" target="_blank" rel="noreferrer">Admin Dashboard</a>`);
  }

  items.push(`<button type="button" class="user-menu-action is-danger" role="menuitem" data-auth-logout="true">Sign out</button>`);
  return items;
}

function renderSignedInSlot(slot, me, { shellMode = false } = {}) {
  slot.innerHTML = "";
  const developerAccess = getDeveloperConsoleAccess(me);
  const creatorAllowed = isCreatorDashboardAllowed(me);
  const adminAllowed = isAdminDashboardAllowed(me);
  const menuId = `developer-user-menu-${Math.random().toString(36).slice(2, 10)}`;

  const widget = document.createElement("div");
  widget.className = shellMode ? "streamsuites-auth" : "user-widget";

  const trigger = document.createElement("div");
  trigger.className = shellMode ? "streamsuites-auth-toggle" : "user-trigger";
  trigger.setAttribute("data-user-trigger", "true");
  trigger.setAttribute("role", "button");
  trigger.setAttribute("tabindex", "0");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", menuId);
  trigger.setAttribute("aria-label", "Toggle user menu");

  const avatar = document.createElement("div");
  avatar.className = shellMode ? "streamsuites-auth-avatar" : "user-avatar";
  const image = document.createElement("img");
  const avatarUrl = getAvatarUrl(me);
  image.src = avatarUrl || "/assets/icons/ui/profile.svg";
  image.alt = "StreamSuites account avatar";
  image.dataset.fallback = "/assets/icons/ui/profile.svg";
  if (avatarUrl) {
    image.classList.add("is-avatar");
  }
  avatar.appendChild(image);

  const copy = document.createElement("div");
  copy.className = shellMode ? "streamsuites-auth-meta" : "user-copy";
  copy.innerHTML = shellMode
    ? `
        <span class="streamsuites-auth-name">
          <span class="streamsuites-auth-name-text">${getDisplayName(me)}</span>
          <span class="ss-role-badges" data-ss-badge-kind="role">
            <img class="streamsuites-auth-tier-badge" src="${getTierBadgeSrc(me)}" alt="${getDisplayTier(me)} tier badge" />
            <img class="streamsuites-auth-tier-badge streamsuites-auth-developer-badge" src="/assets/icons/ui/ss-developer.svg" alt="Developer access badge" />
          </span>
        </span>
        <span class="streamsuites-auth-identity">${getEmail(me)}</span>
      `
    : `
        <span class="user-name">${getDisplayName(me)}</span>
        <span class="user-meta">${getIdentitySummary(me)}</span>
      `;

  trigger.append(avatar, copy);

  const menu = document.createElement("div");
  menu.id = menuId;
  menu.className = shellMode ? "ss-user-menu" : "user-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("data-user-menu", "true");

  const overview = document.createElement("div");
  overview.className = shellMode ? "ss-user-menu-overview" : "user-menu-overview";
  for (const row of getAccountOverviewRows(me)) {
    const item = document.createElement("div");
    item.className = shellMode ? "ss-user-menu-overview-row" : "user-menu-overview-row";
    item.innerHTML = shellMode
      ? `<span class="ss-user-menu-overview-label">${row.label}</span><span class="ss-user-menu-overview-value">${row.value}</span>`
      : `<span class="user-menu-overview-label">${row.label}</span><span class="user-menu-overview-value">${row.value}</span>`;
    overview.appendChild(item);
  }

  if (shellMode) {
    menu.append(overview);
    menu.insertAdjacentHTML("beforeend", buildShellMenuItems({ developerAccess, creatorAllowed, adminAllowed }).join(""));
  } else {
    const header = document.createElement("div");
    header.className = "user-menu-header";
    header.innerHTML = `
      <span class="user-menu-name">${getDisplayName(me)}</span>
      <span class="user-menu-email">${getEmail(me)}</span>
      <span class="user-menu-role">${getIdentitySummary(me)}</span>
    `;
    const links = document.createElement("div");
    links.className = "user-menu-links";
    links.innerHTML = buildStandaloneMenuItems({ developerAccess, creatorAllowed, adminAllowed }).join("");
    menu.append(header, overview, links);
  }

  function toggleMenu() {
    const nextOpen = menu.hidden;
    closeOtherMenus(nextOpen ? menu : null);
    menu.hidden = !nextOpen;
    widget.classList.toggle("is-open", nextOpen);
    trigger.classList.toggle("is-open", nextOpen);
    trigger.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  }

  trigger.addEventListener("click", toggleMenu);
  trigger.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleMenu();
  });

  menu.querySelector("[data-auth-logout='true']")?.addEventListener("click", logoutAndRedirect);

  widget.append(trigger, menu);
  slot.appendChild(widget);
}

function renderAuthState(me, options = {}) {
  document.querySelectorAll("[data-auth-slot], #auth-slot").forEach((slot) => {
    if (!(slot instanceof HTMLElement)) return;
    if (!me?.authenticated) {
      renderSignedOutSlot(slot);
      return;
    }
    renderSignedInSlot(slot, me, options);
  });
}

function bindGlobalAuthUi() {
  if (document.body.dataset.authUiBound === "true") return;
  document.body.dataset.authUiBound = "true";

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const menu = target instanceof Element ? target.closest(".streamsuites-auth, .user-widget") : null;
    if (menu) return;
    closeOtherMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeOtherMenus();
  });
}

function bindAdminStyleShell() {
  if (!document.body.classList.contains(SHELL_PAGE_CLASS)) return;
  if (document.body.dataset.shellUiBound === "true") return;
  document.body.dataset.shellUiBound = "true";

  const collapseToggle = document.getElementById("sidebar-collapse-toggle");
  const refreshButton = document.getElementById("topbar-refresh-button");

  function setCollapsed(collapsed) {
    document.documentElement.classList.toggle("ss-sidebar-collapsed", collapsed);
    document.body.classList.toggle("ss-sidebar-collapsed", collapsed);
    collapseToggle?.setAttribute("aria-expanded", collapsed ? "false" : "true");
    if (collapseToggle) {
      collapseToggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
      collapseToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    }
    try {
      window.localStorage.setItem(SHELL_COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
    } catch (_error) {
      // Ignore storage visibility failures and keep the shell interactive.
    }
  }

  collapseToggle?.addEventListener("click", () => {
    setCollapsed(!document.documentElement.classList.contains("ss-sidebar-collapsed"));
  });

  refreshButton?.addEventListener("click", () => {
    window.location.reload();
  });

  document.querySelectorAll("#app-nav li[data-route]").forEach((item) => {
    const openRoute = (event) => {
      const route = item.getAttribute("data-route");
      if (!route) return;
      const target = item.getAttribute("data-target");
      if (target === "_blank" || event?.ctrlKey || event?.metaKey || event?.button === 1) {
        window.open(route, target || "_blank", "noopener,noreferrer");
        return;
      }
      window.location.assign(route);
    };

    item.addEventListener("click", openRoute);
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openRoute(event);
    });
  });

  setCollapsed(document.documentElement.classList.contains("ss-sidebar-collapsed"));
}

function clearStandaloneShellState() {
  document.documentElement.classList.remove("ss-sidebar-collapsed");
  document.body.classList.remove("ss-sidebar-collapsed");
}

async function initPage({
  navKey,
  authRequired = false,
  developerRequired = false,
  statusTargetId = "page-status",
  shellMode = false,
} = {}) {
  setActiveNav(navKey);
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  if (shellMode) {
    bindAdminStyleShell();
  } else {
    clearStandaloneShellState();
  }
  bindGlobalAuthUi();

  const me = await fetchMe();
  renderAuthState(me, { shellMode });

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

export async function initShellPage(options = {}) {
  return initPage({ ...options, shellMode: true });
}

export async function initStandalonePage(options = {}) {
  return initPage({ ...options, shellMode: false });
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
