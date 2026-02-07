import db from '../db';

export interface IdempotencyRecord {
    idempotency_key: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result_json?: string;
    created_at: string;
}

export async function getIdempotencyKey(key: string, tenantId: string): Promise<IdempotencyRecord | undefined> {
    const row = await db.get(
        'SELECT * FROM idempotency WHERE idempotency_key = ? AND tenant_id = ?',
        [key, tenantId]
    );
    return row as IdempotencyRecord | undefined;
}

export async function createIdempotencyKey(key: string, tenantId: string, endpoint: string, hash: string): Promise<boolean> {
    try {
        await db.run(`
      INSERT INTO idempotency (idempotency_key, tenant_id, endpoint, request_hash, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [key, tenantId, endpoint, hash]);
        return true;
    } catch (err: any) {
        // Check for unique constraint violation (code SQLITE_CONSTRAINT)
        // sqlite3 error objects have code 'SQLITE_CONSTRAINT'
        if (err.message && err.message.includes('SQLITE_CONSTRAINT')) {
            return false; // Already exists
        }
        throw err;
    }
}

export async function updateIdempotencyStatus(key: string, status: 'processing' | 'completed' | 'failed', result?: any) {
    const resultJson = result ? JSON.stringify(result) : null;
    await db.run(`
    UPDATE idempotency 
    SET status = ?, result_json = ? 
    WHERE idempotency_key = ?
  `, [status, resultJson, key]);
}
