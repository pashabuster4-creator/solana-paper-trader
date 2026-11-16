import { run } from "./engine.js";

process.on("unhandledRejection", e => { console.error("Unhandled rejection:", e); process.exitCode = 1; });
process.on("SIGINT", () => { console.log("Stopping. No new trades will be opened."); process.exit(0); });
process.on("SIGTERM", () => { console.log("Stopping. No new trades will be opened."); process.exit(0); });

run().catch(e => { console.error(e); process.exit(1); });
