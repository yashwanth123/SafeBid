import http from "http";
import { env } from "./config/env";
import { createApp } from "./app";
import { initSocket } from "./realtime/socket";
import { prisma } from "./lib/prisma";

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  await prisma.platformBalance.upsert({
    where: { id: "platform" },
    create: { id: "platform", balanceCents: 0 },
    update: {},
  });
  server.listen(env.PORT, () => {
    console.log(`SafeBid API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
