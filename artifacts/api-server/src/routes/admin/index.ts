import { Router, type IRouter } from "express";
import statsRouter from "./stats";
import usersRouter from "./users";
import articlesRouter from "./articles";
import newsRouter from "./news";
import broadcastsRouter from "./broadcasts";

const router: IRouter = Router();

router.use(statsRouter);
router.use(usersRouter);
router.use(articlesRouter);
router.use(newsRouter);
router.use(broadcastsRouter);

export default router;
