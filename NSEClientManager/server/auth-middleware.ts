import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Extend Express Session type
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Shared helper to check demo expiry
async function checkAndEnforceDemoExpiry(user: User): Promise<{ expired: boolean; user: User }> {
  if (user.subscriptionStatus === "demo" && user.demoExpiresAt) {
    const now = new Date();
    const expiryDate = new Date(user.demoExpiresAt);
    if (now > expiryDate) {
      // Mark demo as expired
      const updatedUser = await storage.updateUser(user.id, {
        subscriptionStatus: "inactive",
        demoExpiresAt: null,
      });
      return { expired: true, user: updatedUser! };
    }
  }
  return { expired: false, user };
}

// Middleware to require authentication
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Invalid session" });
  }

  // Check if demo has expired
  const { expired, user: updatedUser } = await checkAndEnforceDemoExpiry(user);
  if (expired) {
    return res.status(403).json({ error: "Demo has expired" });
  }

  // Attach user to request for downstream use
  (req as any).user = updatedUser;
  next();
}

// Middleware to require admin role
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Invalid session" });
  }

  // Check if demo has expired (even for admin, for consistency)
  const { expired, user: updatedUser } = await checkAndEnforceDemoExpiry(user);
  if (expired) {
    return res.status(403).json({ error: "Demo has expired" });
  }

  if (updatedUser.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  (req as any).user = updatedUser;
  next();
}

// Middleware to require active subscription or demo
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Invalid session" });
  }

  // Check if demo has expired
  const { expired, user: updatedUser } = await checkAndEnforceDemoExpiry(user);
  if (expired) {
    return res.status(403).json({ error: "Demo has expired" });
  }

  // Check subscription status
  if (updatedUser.subscriptionStatus !== "active" && updatedUser.subscriptionStatus !== "demo") {
    return res.status(403).json({ error: "Active subscription required" });
  }

  (req as any).user = updatedUser;
  next();
}

// Sanitize user object by removing sensitive fields
export function sanitizeUser(user: User): Omit<User, "password"> {
  const { password, ...sanitized } = user;
  return sanitized;
}

// Export the helper for use in login handlers
export { checkAndEnforceDemoExpiry };
