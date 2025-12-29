import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
  };
  userId?: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123') as unknown as { userId: string };
    if (!payload.userId) {
       throw new Error("Invalid token payload");
    }
    (req as AuthRequest).auth = { userId: payload.userId };
    (req as AuthRequest).userId = payload.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
};
