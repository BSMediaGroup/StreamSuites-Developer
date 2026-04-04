import { initConsolePage } from "./auth.js";

await initConsolePage({
  navKey: "reports",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "reports-status",
});
