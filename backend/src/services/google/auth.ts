import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { env } from '../../config/env';

function readServiceAccountJson(): string {
    const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();

    if (raw.startsWith('{')) {
        return raw;
    }

    if (raw.startsWith('ey')) {
        return Buffer.from(raw, 'base64').toString('utf8');
    }

    const resolvedPath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    if (fs.existsSync(resolvedPath)) {
        return fs.readFileSync(resolvedPath, 'utf8');
    }

    return raw;
}

function parseServiceAccountCredentials(): Record<string, unknown> {
    const jsonString = readServiceAccountJson();
    try {
        return JSON.parse(jsonString) as Record<string, unknown>;
    } catch (error) {
        throw new Error(
            'Invalid GOOGLE_SERVICE_ACCOUNT_JSON. Provide raw JSON, base64 JSON, or a path to a JSON file.'
        );
    }
}

export function createGoogleAuth(scopes: string[]): google.auth.GoogleAuth {
    return new google.auth.GoogleAuth({
        credentials: parseServiceAccountCredentials(),
        scopes,
    });
}
