import crypto from 'crypto';
import db from '../db';

export type SubmissionType = 'receipt' | 'statement';

export type QueueRecord = {
    id: string;
    tenant_id: string;
    user_id: string;
    type: SubmissionType;
    payload_json: string;
    idempotency_key: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    last_error?: string;
    result_json?: string;
    next_attempt_at: string;
    created_at: string;
    updated_at: string;
};

export async function enqueueSubmission(params: {
    tenantId: string;
    userId: string;
    type: SubmissionType;
    payload: unknown;
    idempotencyKey: string;
}): Promise<string> {
    const id = crypto.randomUUID();
    const payloadJson = JSON.stringify(params.payload);

    await db.run(
        `INSERT INTO submission_queue (id, tenant_id, user_id, type, payload_json, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, params.tenantId, params.userId, params.type, payloadJson, params.idempotencyKey]
    );

    return id;
}

export async function listSubmissions(tenantId: string, limit: number = 50): Promise<QueueRecord[]> {
    const rows = await db.query(
        `SELECT * FROM submission_queue
         WHERE tenant_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [tenantId, limit]
    );
    return rows as QueueRecord[];
}

export async function claimNextSubmission(): Promise<QueueRecord | undefined> {
    const row = await db.get(
        `SELECT * FROM submission_queue
         WHERE status = 'pending' AND next_attempt_at <= CURRENT_TIMESTAMP
         ORDER BY created_at ASC
         LIMIT 1`
    );
    if (!row) return undefined;

    const update = await db.run(
        `UPDATE submission_queue
         SET status = 'processing', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`,
        [row.id]
    );

    if (update.changes === 0) return undefined;
    return row as QueueRecord;
}

export async function markSubmissionSuccess(id: string, result?: unknown) {
    const resultJson = result ? JSON.stringify(result) : null;
    await db.run(
        `UPDATE submission_queue
         SET status = 'completed', result_json = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [resultJson, id]
    );
}

export async function markSubmissionFailure(
    id: string,
    status: 'pending' | 'failed',
    error: string,
    nextAttemptAt: Date,
    attempts: number
) {
    await db.run(
        `UPDATE submission_queue
         SET status = ?, last_error = ?, attempts = ?, next_attempt_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [status, error, attempts, nextAttemptAt.toISOString(), id]
    );
}
