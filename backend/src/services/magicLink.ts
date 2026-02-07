import crypto from 'crypto';
import db from '../db';
import { env } from '../config/env';
import { sendMagicLink } from './mailer';

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issueMagicLink(userId: string, email: string): Promise<{ magicLink?: string; token?: string }> {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();

    await db.run('DELETE FROM magic_tokens WHERE user_id = ? OR expires_at < CURRENT_TIMESTAMP', [
        userId
    ]);

    await db.run(
        'INSERT INTO magic_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        [tokenHash, userId, expiresAt]
    );

    const link = `${env.APP_BASE_URL}/login?token=${rawToken}`;
    if (env.NODE_ENV !== 'production') {
        try {
            await sendMagicLink(email, link);
        } catch (err) {
            // Ignore SMTP errors in non-production
        }
        return { magicLink: link, token: rawToken };
    }

    await sendMagicLink(email, link);
    return {};
}

export function hashMagicToken(rawToken: string): string {
    return hashToken(rawToken);
}
