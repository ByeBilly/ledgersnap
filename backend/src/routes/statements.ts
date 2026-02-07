import { Router } from 'express';
import { env } from '../config/env';

const router = Router();

router.post('/', async (req, res) => {
    // 1. Upload file stub
    // 2. Placeholder parse list
    res.json({
        status: 'success',
        message: 'Statement uploaded and queued for processing (Stub)',
        statementId: `ST-${Date.now()}`
    });
});

export default router;
