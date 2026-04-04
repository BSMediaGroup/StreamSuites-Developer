import { initConsolePage } from "./auth.js";

await initConsolePage({ navKey: "reports", authRequired: true, statusTargetId: "reports-status" });
