import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthedRequest extends Request {
  user?: { id: string; role: "buyer" | "farmer" | "admin" };
}

/**
 * JWT auth. In `NODE_ENV=development` with no Authorization header, a demo
 * user is injected so the hackathon demo can run without a full login flow —
 * this is intentionally disabled in production.
 */
export function authenticate(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header) {
    if (env.nodeEnv === "development") {
      req.user = { id: "demo-buyer", role: "buyer" };
      return next();
    }
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthedRequest["user"];
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Array<"buyer" | "farmer" | "admin">) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
}
