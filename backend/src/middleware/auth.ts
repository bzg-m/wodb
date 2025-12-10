import type { NextFunction, Request, Response } from 'express';

import admin from '../firebaseAdmin.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string | null;
    name?: string | null;
    claims?: Record<string, unknown>;
  };
}

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
  const auth = (req.headers.authorization || '') as string;
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing token' });
  }
  const idToken = auth.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    (req as AuthenticatedRequest).user = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: (decoded.name as string) || null,
      claims: decoded,
    };
    return next();
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    return res.status(401).json({ error: 'invalid token', details });
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if ((req as AuthenticatedRequest).user) return next();
  return next(new Error('unauthenticated'));
}
