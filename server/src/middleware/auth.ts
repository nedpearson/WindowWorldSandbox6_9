import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; companyId?: string | null };
}

/**
 * Verifies JWT and attaches req.user (including companyId).
 * One DB query per request maximum — companyId is fetched here once
 * so downstream routes never need to re-query it.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };

    // Single DB lookup — gets user + companyId in one round trip
    const { prisma } = await import('../index.js');
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, companyId: true },
    });
    if (!userRecord) return res.status(401).json({ error: 'User no longer exists in database' });

    req.user = { userId: decoded.userId, role: decoded.role, companyId: userRecord.companyId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Requires role = admin or manager. Must be chained after requireAuth. */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!['admin', 'manager', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin or manager role required' });
  }
  next();
}

/** Requires role = admin only (not manager). Must be chained after requireAuth. */
export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}
