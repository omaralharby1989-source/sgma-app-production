import { Router } from "express";

const router = Router();

router.get("/developer-info", (_req, res): void => {
  res.json({
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
  });
});

export default router;
