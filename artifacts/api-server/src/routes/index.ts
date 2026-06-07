import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import memberRouter from "./member";
import developerInfoRouter from "./developer-info";
import staticPagesRouter from "./static-pages";
import boardRouter from "./board";
import chatRouter from "./chat";
import newsRouter from "./news";
import articlesRouter from "./articles";
import broadcastsRouter from "./broadcasts";
import volunteerDelegationsRouter from "./volunteer-delegations";
import adsRouter from "./ads";
import tasksRouter from "./tasks";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(memberRouter);
router.use(developerInfoRouter);
router.use(staticPagesRouter);
router.use(boardRouter);
router.use(chatRouter);
router.use(newsRouter);
router.use(articlesRouter);
router.use(broadcastsRouter);
router.use(volunteerDelegationsRouter);
router.use(adsRouter);
router.use(tasksRouter);
router.use(adminRouter);

export default router;
