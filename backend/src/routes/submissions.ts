import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createIdempotencyKey, getIdempotencyKey, updateIdempotencyStatus } from '../services/idempotency';
import { enqueueSubmission, listSubmissions, SubmissionType } from '../services/queue';

const router = Router();

router.use(authenticate);

function hashPayload(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

router.post('/', async (req, res) => {
    const user = (req as AuthRequest).user!;
    const { type, payload, idempotencyKey } = req.body as {
        type?: SubmissionType;
        payload?: unknown;
        idempotencyKey?: string;
    };

    if (!type || !payload || !idempotencyKey) {
        return res.status(400).json({ error: 'type, payload, and idempotencyKey are required' });
    }

    if (!['receipt', 'statement'].includes(type)) {
        return res.status(400).json({ error: 'Unsupported submission type' });
    }

    try {
        const existing = await getIdempotencyKey(idempotencyKey, user.tenantId);
        if (existing?.status === 'completed' && existing.result_json) {
            return res.json({ status: 'completed', result: JSON.parse(existing.result_json) });
        }
        if (existing?.status === 'processing' || existing?.status === 'pending') {
            return res.status(202).json({ status: existing.status });
        }

        const requestHash = hashPayload(payload);
        const created = await createIdempotencyKey(idempotencyKey, user.tenantId, `/submissions/${type}`, requestHash);
        if (!created) {
            return res.status(202).json({ status: 'pending' });
        }

        const queueId = await enqueueSubmission({
            tenantId: user.tenantId,
            userId: user.userId,
            type,
            payload,
            idempotencyKey,
        });

        res.status(202).json({ status: 'queued', queueId });
    } catch (error: any) {
        await updateIdempotencyStatus(idempotencyKey, 'failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    const user = (req as AuthRequest).user!;
    try {
        const submissions = await listSubmissions(user.tenantId);
        res.json({ submissions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
