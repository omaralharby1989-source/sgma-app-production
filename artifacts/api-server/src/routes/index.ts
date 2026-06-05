import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import memberRouter from "./member";
import publicRouter from "./public";
import chatRouter from "./chat";
import newsRouter from "./news";
import broadcastsRouter from "./broadcasts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(memberRouter);
router.use(publicRouter);
router.use(chatRouter);
router.use(newsRouter);
router.use(broadcastsRouter);

export default router;
