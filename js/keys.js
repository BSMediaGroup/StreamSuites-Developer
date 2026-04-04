import { initConsolePage } from "./auth.js";

await initConsolePage({
  navKey: "keys",
  authRequired: true,
  developerRequired: true,
  statusTargetId: "keys-status",
});
