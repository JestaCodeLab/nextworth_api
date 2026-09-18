import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import app from "./app.js";
import { startOfferExpiryReminderJob } from "./jobs/offerExpiryReminder.js";

async function start() {
  await connectDB();
  startOfferExpiryReminderJob();
  app.listen(Number(env.PORT), () => {
    console.log(`[server] Nexworth API listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
