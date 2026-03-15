import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import contactsRouter from "./contacts.js";
import conversationsRouter from "./conversations.js";
import messagesRouter from "./messages.js";
import usersRouter from "./users.js";
import forwardRouter from "./forward.js";
import instancesRouter from "./instances.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/contacts", contactsRouter);
router.use("/conversations", conversationsRouter);
router.use("/conversations/:id/messages", messagesRouter);
router.use("/users", usersRouter);
router.use("/instances", instancesRouter);
router.use(forwardRouter);

export default router;
