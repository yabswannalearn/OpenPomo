import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    role: string;
  };
  userId?: string;
  userRole?: string;
  body: any;
  cookies: { [key: string]: string };
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Try to get token from cookie first, then from Authorization header (for backwards compatibility)
  const cookies = (req as AuthRequest).cookies;
  let token = cookies?.token;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123') as { userId: string; role?: string };
    if (!payload.userId) {
       throw new Error("Invalid token payload");
    }
    (req as AuthRequest).auth = { userId: payload.userId, role: payload.role || 'user' };
    (req as AuthRequest).userId = payload.userId;
    (req as AuthRequest).userRole = payload.role || 'user';
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
