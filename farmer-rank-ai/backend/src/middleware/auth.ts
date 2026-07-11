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
    // Demo-only convenience, strictly gated behind NODE_ENV=development;
    // production must always rely on verified JWT identity.
    if (env.nodeEnv === "development") {
      const demoRole = (req.headers["x-demo-role"] as string) || "buyer";
      const allowedDemoRoles = ["buyer", "farmer", "admin"] as const;
      const role = allowedDemoRoles.includes(demoRole as any)
        ? (demoRole as typeof allowedDemoRoles[number])
        : "buyer";
      req.user = { id: `demo-${role}`, role };
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
