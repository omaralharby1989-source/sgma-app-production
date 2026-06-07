import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;

if (!SECRET) {
  throw new Error(
    "Missing JWT signing secret: set JWT_SECRET (or SESSION_SECRET) in the environment",
  );
}

const JWT_SECRET: string = SECRET;

export interface JwtPayload {
  userId: number;
  account: string;
  role: string;
  status: string;
  accessScope: string;
}

// Blocks SYRIA_ACADEMY_ONLY users from full-app-only features.
// Academy + read-only news/articles routes do NOT use this guard.
export function requireFullApp(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.accessScope === "SYRIA_ACADEMY_ONLY") {
    res.status(403).json({ error: "هذه الميزة غير متاحة لحسابك" });
    return;
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
