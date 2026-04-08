import { initShellPage } from "./auth.js";

await initShellPage({
  navKey: "keys",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "keys-status",
});
