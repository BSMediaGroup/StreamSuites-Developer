import { initConsolePage } from "./auth.js";

await initConsolePage({ navKey: "keys", authRequired: true, statusTargetId: "keys-status" });
