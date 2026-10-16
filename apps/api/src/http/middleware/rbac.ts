import type { NextFunction, Request, Response } from "express";

const ROLE_ACTIONS: Record<string, Set<string>> = {
  administrator: new Set(["create", "edit", "delete", "view", "approve"]),
  personnel: new Set(["create", "edit", "delete", "view"]),
  passenger: new Set(["view", "book"]),
};

export function requireRole(role: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const allowed = ROLE_ACTIONS[role];
    if (!allowed?.has(action)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}

export function requireTechnicalPersonnel(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "personnel" || req.user.personnelType !== "technical") {
    res.status(403).json({ error: "technical_personnel_only" });
    return;
  }
  next();
}
