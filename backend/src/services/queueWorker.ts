import db from '../db';
import { env } from '../config/env';
import { claimNextSubmission, markSubmissionFailure, markSubmissionSuccess, QueueRecord } from './queue';
import { updateIdempotencyStatus } from './idempotency';
import * as drive from './google/drive';
import * as sheets from './google/sheets';
import { getNextCounter, generateReceiptId } from './counters';

type ReceiptPayload = {
    imageBase64: string;
    merchant?: string;
    total?: number | string;
    date?: string;
};

type StatementTransaction = {
    txn_date?: string;
    description?: string;
    debit?: number | string;
    credit?: number | string;
    balance?: number | string;
    category_guess?: string;
};

type StatementPayload = {
    fileBase64?: string;
    mimeType?: string;
    statementDate?: string;
    transactions?: StatementTransaction[];
};

function getMonthKey(dateStr?: string): string {
    if (!dateStr) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return dateStr.slice(0, 7);
}

async function processReceipt(record: QueueRecord): Promise<{ receiptId: string; fileId: string }> {
    const payload = JSON.parse(record.payload_json) as ReceiptPayload;
    if (!payload.imageBase64) throw new Error('Missing imageBase64 in payload');

    const tenant = await db.get(
        `SELECT tenant_id, business_code, master_spreadsheet_id, drive_root_folder_id
         FROM tenants WHERE tenant_id = ?`,
        [record.tenant_id]
    );
    if (!tenant) throw new Error('Tenant not found');
    if (!tenant.drive_root_folder_id || !tenant.master_spreadsheet_id) {
        throw new Error('Tenant assets not provisioned');
    }

    const user = await db.get(
        `SELECT user_id, staff_code FROM users WHERE user_id = ?`,
        [record.user_id]
    );
    if (!user) throw new Error('User not found');

    const buffer = Buffer.from(payload.imageBase64, 'base64');
    const fileId = await drive.uploadFile(
        tenant.drive_root_folder_id,
        buffer,
        'image/webp',
        `receipt-${Date.now()}.webp`
    );

    const yyyymm = getMonthKey(payload.date);
    const counter = await getNextCounter(tenant.tenant_id, user.staff_code, yyyymm, 'receipt');
    const receiptId = generateReceiptId(tenant.business_code, user.staff_code, yyyymm, counter);

    const tabName = `${yyyymm}_Receipts_MASTER`;
    await sheets.ensureTabs(tenant.master_spreadsheet_id, [tabName]);
    await sheets.appendRows(tenant.master_spreadsheet_id, tabName, [[
        receiptId,
        payload.merchant || '',
        payload.total || '',
        payload.date || '',
        fileId,
        'SUBMITTED',
        record.idempotency_key
    ]]);

    return { receiptId, fileId };
}

function normalizeAmount(value?: number | string): string {
    if (value === undefined || value === null || value === '') return '';
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num)) return '';
    return num.toString();
}

function monthKeyFromTransaction(txn: StatementTransaction, fallback?: string): string {
    if (txn.txn_date && txn.txn_date.length >= 7) {
        return txn.txn_date.slice(0, 7);
    }
    return getMonthKey(fallback);
}

async function processStatement(record: QueueRecord): Promise<{ fileId?: string; rowsAppended: number }> {
    const payload = JSON.parse(record.payload_json) as StatementPayload;
    const transactions = payload.transactions || [];
    if (transactions.length === 0) throw new Error('Missing transactions in payload');

    const tenant = await db.get(
        `SELECT tenant_id, business_code, master_spreadsheet_id, drive_root_folder_id
         FROM tenants WHERE tenant_id = ?`,
        [record.tenant_id]
    );
    if (!tenant) throw new Error('Tenant not found');
    if (!tenant.drive_root_folder_id || !tenant.master_spreadsheet_id) {
        throw new Error('Tenant assets not provisioned');
    }

    let fileId: string | undefined;
    if (payload.fileBase64) {
        const buffer = Buffer.from(payload.fileBase64, 'base64');
        const mimeType = payload.mimeType || 'application/pdf';
        fileId = await drive.uploadFile(
            tenant.drive_root_folder_id,
            buffer,
            mimeType,
            `statement-${Date.now()}`
        );
    }

    const grouped = new Map<string, StatementTransaction[]>();
    for (const txn of transactions) {
        const key = monthKeyFromTransaction(txn, payload.statementDate);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(txn);
    }

    let rowsAppended = 0;
    for (const [monthKey, txns] of grouped.entries()) {
        const tabName = `${monthKey}_Transactions_MASTER`;
        await sheets.ensureTabs(tenant.master_spreadsheet_id, [tabName]);
        const rows = txns.map((txn) => [
            txn.txn_date || '',
            txn.description || '',
            normalizeAmount(txn.debit),
            normalizeAmount(txn.credit),
            normalizeAmount(txn.balance),
            txn.category_guess || '',
            fileId || '',
            record.idempotency_key,
        ]);
        await sheets.appendRows(tenant.master_spreadsheet_id, tabName, rows);
        rowsAppended += rows.length;
    }

    return { fileId, rowsAppended };
}

async function processSubmission(record: QueueRecord) {
    if (record.type === 'receipt') {
        const result = await processReceipt(record);
        await markSubmissionSuccess(record.id, result);
        await updateIdempotencyStatus(record.idempotency_key, 'completed', result);
        return;
    }

    if (record.type === 'statement') {
        const result = await processStatement(record);
        await markSubmissionSuccess(record.id, result);
        await updateIdempotencyStatus(record.idempotency_key, 'completed', result);
        return;
    }

    throw new Error(`Unsupported submission type: ${record.type}`);
}

export function startQueueWorker() {
    let running = false;

    const tick = async () => {
        if (running) return;
        running = true;
        try {
            const record = await claimNextSubmission();
            if (!record) return;
            try {
                await processSubmission(record);
            } catch (error: any) {
                const attempts = (record.attempts || 0) + 1;
                const backoffMs = Math.min(600000, attempts * 30000);
                const nextAttempt = new Date(Date.now() + backoffMs);
                const status = attempts >= env.QUEUE_MAX_ATTEMPTS ? 'failed' : 'pending';

                await markSubmissionFailure(record.id, status, error.message, nextAttempt, attempts);
                if (status === 'failed') {
                    await updateIdempotencyStatus(record.idempotency_key, 'failed', { error: error.message });
                }
            }
        } finally {
            running = false;
        }
    };

    const interval = setInterval(tick, env.QUEUE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
}
