import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initDatabase } from "./bootstrap/initDatabase.js";
import { seedAdmin } from "./bootstrap/seedAdmin.js";
import { seedDoctors } from "./bootstrap/seedDoctors.js";
import { initSocket } from "./realtime/socket.js";
import { SmsService } from "./services/smsService.js";

async function main() {
  await initDatabase();
  await seedAdmin();
  await seedDoctors();

  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`HQMS server listening on :${env.port}`);
  });

  // Background SMS outbox worker (provider integration is stubbed)
  if (env.nodeEnv !== "test") {
    setInterval(() => {
      SmsService.processOutboxOnce({ limit: 25 }).catch(() => {});
    }, 4000);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

