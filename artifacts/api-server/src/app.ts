import express, { type Express } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import router from "./routes";

const app: Express = express();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/api/socket.io",
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_conversation", (conversationId: number) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("leave_conversation", (conversationId: number) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export { httpServer };
export default app;
