import { Router } from 'express';
import { authenticate } from '../middleware/auth';
// import { idempotency } from '../middleware/idempotency';
import * as drive from '../services/google/drive';
import * as sheets from '../services/google/sheets';
import { getNextCounter, generateReceiptId } from '../services/counters';
import { env } from '../config/env';

const router = Router();

router.use(authenticate);

router.post('/', async (req, res) => {
    try {
        // 1. Validate Input (simplistic for now)
        const { imageBase64, merchant, total, date, tenantId, staffCode } = req.body;
        if (!imageBase64 || !tenantId) return res.status(400).json({ error: 'Missing required fields' });

        // 2. Upload to Drive
        // Hardcoded folder for now or fetched from tenant logic
        // const folderId = await getTenantFolder(tenantId); 
        // MOCK: using shared drive ID for init
        const folderId = env.LEDGERSNAP_SHARED_DRIVE_ID;

        const buffer = Buffer.from(imageBase64, 'base64');
        const fileId = await drive.uploadFile(folderId, buffer, 'image/webp', `receipt-${Date.now()}.webp`);

        // 3. Extaction & Logic (Stubbed)

        // 4. Counters & ID
        // const counter = getNextCounter(tenantId, staffCode || 'SYS', '2024-05');
        // const receiptId = generateReceiptId('TUR', staffCode || 'SYS', '2024-05', counter);

        // 5. Append to Sheets (Stubbed ID)
        const receiptId = `RC-TEST-${Date.now()}`;

        // await sheets.appendRows(tenantSpreadsheetId, '2024-05_Receipts_MASTER', [[receiptId, merchant, total, date, fileId, 'SUBMITTED']]);

        res.json({ status: 'success', receiptId, fileId });
    } catch (error: any) {
        console.error('Receipt submission failed:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
