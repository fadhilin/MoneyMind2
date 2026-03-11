import type { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/auth.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

/**
 * Middleware that verifies the Better Auth session from the incoming request.
 * Attaches userId to req for downstream route handlers.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v ?? '']),
      ) as HeadersInit,
    });

    if (!session?.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    (req as AuthenticatedRequest).userId = session.user.id;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
