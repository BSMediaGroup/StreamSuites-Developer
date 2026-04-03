import { initConsolePage } from "./auth.js";

const page = await initConsolePage({ navKey: "dashboard", authRequired: true, statusTargetId: "dashboard-status" });

if (!page.blocked) {
  const me = page.me || {};
  document.getElementById("dashboard-identity").textContent = me.display_name || me.email || "Authenticated account";
  document.getElementById("dashboard-role").textContent = me.role || "account";
  document.getElementById("dashboard-tier").textContent = me.effective_tier?.tier_label || me.tier || "core";
}
