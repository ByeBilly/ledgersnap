import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: 'staff' | 'manager';
        tenantId: string;
    };
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as AuthRequest['user'];
        if (!payload || !payload.userId || !payload.tenantId || !payload.role) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        (req as AuthRequest).user = payload;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden' });
    }
}

export function requireRole(role: 'staff' | 'manager') {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthRequest).user;
        if (!user || (role === 'manager' && user.role !== 'manager')) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
