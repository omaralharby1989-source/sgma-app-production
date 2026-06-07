import { Router, type IRouter } from "express";
import statsRouter from "./stats";
import usersRouter from "./users";
import articlesRouter from "./articles";
import newsRouter from "./news";
import broadcastsRouter from "./broadcasts";
import volunteerDelegationsRouter from "./volunteer-delegations";
import adsRouter from "./ads";
import tasksRouter from "./tasks";
import academyRouter from "./academy";

const router: IRouter = Router();

router.use(statsRouter);
router.use(usersRouter);
router.use(articlesRouter);
router.use(newsRouter);
router.use(broadcastsRouter);
router.use(volunteerDelegationsRouter);
router.use(adsRouter);
router.use(tasksRouter);
router.use(academyRouter);

export default router;
