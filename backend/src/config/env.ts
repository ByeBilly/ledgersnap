import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    PORT: z.string().default('3000'),
    APP_BASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
    JWT_EXPIRES_IN: z.string().default('7d'),
    MAGIC_LINK_TTL_MINUTES: z.string().transform(Number).default('15'),

    // Google
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().describe("Base64 or Raw JSON"),
    LEDGERSNAP_SHARED_DRIVE_ID: z.string(),

    // Database
    DB_URL: z.string().optional(), // Used if remote
    SQLITE_PATH: z.string().default('ledgersnap.db'),

    // SMTP (for Magic Links)
    SMTP_HOST: z.string(),
    SMTP_PORT: z.string().transform(Number),
    SMTP_USER: z.string(),
    SMTP_PASS: z.string(),
    SMTP_FROM: z.string().email(),

    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX: z.string().transform(Number).default('300'),
    AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('20'),

    // Queue worker
    QUEUE_POLL_INTERVAL_MS: z.string().transform(Number).default('5000'),
    QUEUE_MAX_ATTEMPTS: z.string().transform(Number).default('5'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missing = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
            console.error('❌ Invalid environment variables:\n', missing);
            process.exit(1);
        }
        throw error;
    }
}

export const env = validateEnv();
