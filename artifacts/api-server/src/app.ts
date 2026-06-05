import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

app.use("/api", router);

// Body-parser payload-too-large handler — return a clear Arabic JSON error
// instead of the default HTML 413 page (e.g. oversized avatar uploads).
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.too.large") {
    res.status(413).json({ error: "حجم البيانات كبير جداً، يرجى اختيار صورة أصغر" });
    return;
  }
  next(err);
});

export default app;
