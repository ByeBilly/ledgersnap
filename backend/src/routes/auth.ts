import { Router } from 'express';
import { env } from '../config/env';
import db from '../db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authRateLimit } from '../middleware/rateLimit';
import { issueMagicLink, hashMagicToken } from '../services/magicLink';

const router = Router();

router.post('/request-link', authRateLimit, async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await db.get(
        'SELECT user_id, email FROM users WHERE email = ? AND status = ?',
        [email, 'active']
    );

    if (!user) {
        return res.json({ message: 'If the account exists, a link was sent.' });
    }

    const payload = { message: 'If the account exists, a link was sent.' };

    try {
        const magic = await issueMagicLink(user.user_id, user.email);
        if (env.NODE_ENV !== 'production') {
            return res.json({ ...payload, ...magic });
        }
    } catch (error) {
        if (env.NODE_ENV === 'production') {
            return res.status(500).json({ error: 'Unable to send magic link' });
        }
    }

    res.json(payload);
});

router.get('/verify', async (req, res) => {
    const token = req.query.token as string | undefined;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const tokenHash = hashMagicToken(token);
    const record = await db.get(
        `SELECT token_hash, user_id, expires_at, used_at
         FROM magic_tokens
         WHERE token_hash = ?`,
        [tokenHash]
    );

    if (!record || record.used_at || new Date(record.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await db.get(
        `SELECT u.user_id, u.tenant_id, u.email, u.staff_code, u.role, u.status, u.name,
                t.business_code, t.business_name
         FROM users u
         LEFT JOIN tenants t ON t.tenant_id = u.tenant_id
         WHERE u.user_id = ?`,
        [record.user_id]
    );

    if (!user || user.status !== 'active') {
        return res.status(401).json({ error: 'User inactive' });
    }

    await db.run('UPDATE magic_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?', [
        tokenHash
    ]);

    const jwtToken = jwt.sign(
        {
            userId: user.user_id,
            tenantId: user.tenant_id,
            role: user.role,
            staffCode: user.staff_code,
            email: user.email,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.json({
        token: jwtToken,
        user: {
            userId: user.user_id,
            tenantId: user.tenant_id,
            role: user.role,
            staffCode: user.staff_code,
            email: user.email,
            name: user.name,
            businessCode: user.business_code,
            businessName: user.business_name,
        },
    });
});

export default router;
