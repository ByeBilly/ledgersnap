import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

type RateLimiterOptions = {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
};

type RateEntry = { count: number; resetAt: number };

function createRateLimiter(options: RateLimiterOptions) {
    const store = new Map<string, RateEntry>();
    const windowMs = options.windowMs;
    const max = options.max;
    const keyGenerator = options.keyGenerator ?? ((req) => req.ip || 'unknown');

    return (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const now = Date.now();
        const entry = store.get(key);

        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= max) {
            const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader('Retry-After', retryAfterSeconds.toString());
            return res.status(429).json({ error: 'Too Many Requests' });
        }

        entry.count += 1;
        store.set(key, entry);
        next();
    };
}

export const rateLimit = createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
});

export const authRateLimit = createRateLimiter({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    keyGenerator: (req) => `${req.ip || 'unknown'}:auth`,
});
