import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contactsRouter from "./contacts";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/contacts", contactsRouter);
router.use("/conversations", conversationsRouter);
router.use("/conversations/:id/messages", messagesRouter);
router.use("/users", usersRouter);

export default router;
