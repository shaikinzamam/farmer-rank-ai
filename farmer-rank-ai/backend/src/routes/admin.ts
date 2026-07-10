import { Router } from "express";
import { getAuditLogs } from "../db/postgres";
import { requireRole } from "../middleware/auth";

export const adminRouter = Router();

/** GET /admin/audit — retrieves logs of agent decisions and safety checks. */
adminRouter.get("/admin/audit", requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 500);
    const logs = await getAuditLogs(limit);
    return res.status(200).json({ logs });
  } catch (err) {
    console.error("[GET /admin/audit] error:", err);
    return res.status(500).json({ error: "Failed to fetch audit logs." });
  }
});
