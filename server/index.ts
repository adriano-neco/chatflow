import { httpServer } from "./app.js";
import { viteProxyUpgrade } from "./lib/frontendProxy.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

httpServer.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  if (!url.startsWith("/api/socket.io")) {
    viteProxyUpgrade.upgrade!(req, socket as any, head);
  }
});

httpServer.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
