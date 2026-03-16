import express, { type Express } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes/index.js";
import { ensureBucket } from "./lib/storage.js";
import { logger, httpLoggerMiddleware } from "./lib/logger.js";

const app: Express = express();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

io.on("connection", (socket) => {
  logger.debug("Socket connected", { socketId: socket.id });

  socket.on("join_conversation", (conversationId: number) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId: number) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("disconnect", () => {
    logger.debug("Socket disconnected", { socketId: socket.id });
  });
});

ensureBucket()
  .then(() => logger.info("MinIO bucket ready", { bucket: process.env.MINIO_BUCKET ?? "chatflow" }))
  .catch((err) => logger.warn("MinIO bucket init failed — uploads may not work", { error: String(err) }));

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(httpLoggerMiddleware());

app.use("/api", router);

const vitePort = 5000;
const viteProxy = createProxyMiddleware({
  target: `http://localhost:${vitePort}`,
  changeOrigin: true,
  ws: true,
});

app.use(viteProxy);

export { httpServer };
export default app;
