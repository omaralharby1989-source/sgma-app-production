import { Router, type IRouter } from "express";
import { requireAuth, requireFullApp } from "../../middlewares/auth";
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

// Block Syria-academy-only accounts from ALL admin APIs (403), regardless of
// role. requireAuth runs first so req.user.accessScope is populated; each
// sub-router re-runs requireAuth (idempotent) plus its own role checks.
router.use(requireAuth, requireFullApp);

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
