import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { parseCookies } from "../utils/cookies.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else {
    const cookies = parseCookies(req);
    token = cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
    }

    // Find user in db to attach
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId)
    });

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // Exclude password
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Requires admin privileges" });
  }
  // Mandatory first-login password change: an admin who still has the
  // initial password gets a distinct code the frontend uses to route them
  // to the change-password screen instead of the admin panel.
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      message: "برای ادامه باید رمز عبور خود را تغییر دهید",
      code: "PASSWORD_CHANGE_REQUIRED",
    });
  }
  next();
};
