import { initShellPage } from "./auth.js";

const page = await initShellPage({
  navKey: "dashboard",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "dashboard-status",
});

if (!page.blocked) {
  const me = page.me || {};
  document.getElementById("dashboard-identity").textContent =
    me.display_name || me.user_code || me.email || "Authenticated account";
  document.getElementById("dashboard-role").textContent =
    me.account_type || me.access_class || me.role || "account";
  document.getElementById("dashboard-tier").textContent =
    me.effective_tier?.display_tier_label || me.effective_tier?.tier_label || me.tier || "core";
}
