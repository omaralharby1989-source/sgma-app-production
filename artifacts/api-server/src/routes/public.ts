import { Router } from "express";
import { db } from "@workspace/db";

const router = Router();

const FALLBACK_INFO = {
  appName: "SGMA APP2",
  version: "1.0.0",
  developer: "SGMA Team",
  description:
    "منصة إدارة الأعضاء المجتمعية — SGMA Community Member Management Platform. A bilingual Arabic-English mobile-first web application for managing community members with role-based access control.",
  contact: "sgma@example.com",
  builtWith: [
    "React + Vite",
    "TypeScript",
    "Express 5",
    "PostgreSQL + Drizzle ORM",
    "JWT Authentication",
    "TanStack Query",
    "Tailwind CSS",
    "shadcn/ui",
  ],
};

router.get("/developer-info", async (req, res): Promise<void> => {
  try {
    const rows = await db.query.developerInfoTable.findFirst({
      where: (t, { eq }) => eq(t.isActive, true),
    });

    if (rows) {
      let builtWith: string[] = [];
      try {
        builtWith = JSON.parse(rows.builtWith);
      } catch {
        builtWith = [];
      }
      res.json({ ...rows, builtWith });
      return;
    }
  } catch (err) {
    req.log.warn({ err }, "developer_info DB read failed, using fallback");
  }

  res.json(FALLBACK_INFO);
});

export default router;
