import { initShellPage } from "./auth.js";

await initShellPage({
  navKey: "reports",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "reports-status",
});
