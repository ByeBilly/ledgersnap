import { Router } from 'express';
import crypto from 'crypto';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import * as drive from '../services/google/drive';
import * as sheets from '../services/google/sheets';
import db from '../db';
import { env } from '../config/env';
import { issueMagicLink } from '../services/magicLink';

const router = Router();

function generateBusinessCode(name: string): string {
    const prefix = name.replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(3, 'X').slice(0, 3);
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    return `${prefix}${suffix}`;
}

async function createUniqueBusinessCode(name: string): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
        const code = generateBusinessCode(name);
        const exists = await db.get('SELECT 1 FROM tenants WHERE business_code = ?', [code]);
        if (!exists) return code;
    }
    throw new Error('Unable to allocate business code');
}

router.post('/provision', authRateLimit, async (req, res) => {
    try {
        const { businessName, adminEmail, adminName, businessCode } = req.body as {
            businessName?: string;
            adminEmail?: string;
            adminName?: string;
            businessCode?: string;
        };

        if (!businessName || !adminEmail || !adminName) {
            return res.status(400).json({ error: 'businessName, adminEmail, and adminName are required' });
        }

        const existing = await db.get('SELECT 1 FROM users WHERE email = ?', [adminEmail]);
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const code = businessCode || await createUniqueBusinessCode(businessName);
        const tenantId = crypto.randomUUID();

        const folderId = await drive.createFolder(env.LEDGERSNAP_SHARED_DRIVE_ID, `LedgerSnap_${code}`);
        const spreadsheetId = await sheets.createSpreadsheet(`LedgerSnap_MASTER_${code}`, folderId);
        await sheets.ensureTabs(spreadsheetId, ['STAFF', 'COUNTERS', 'AUDIT_LOG']);

        await db.run(
            `INSERT INTO tenants (tenant_id, business_code, business_name, master_spreadsheet_id, drive_root_folder_id)
             VALUES (?, ?, ?, ?, ?)`,
            [tenantId, code, businessName, spreadsheetId, folderId]
        );

        const userId = crypto.randomUUID();
        await db.run(
            `INSERT INTO users (user_id, tenant_id, email, staff_code, role, status, name)
             VALUES (?, ?, ?, ?, 'manager', 'active', ?)`,
            [userId, tenantId, adminEmail, 'MGR01', adminName]
        );

        const magic = await issueMagicLink(userId, adminEmail);

        res.json({
            tenant: {
                tenantId,
                businessCode: code,
                businessName,
            },
            user: {
                userId,
                tenantId,
                email: adminEmail,
                staffCode: 'MGR01',
                role: 'manager',
                name: adminName,
            },
            magicLink: magic.magicLink,
            token: magic.token,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.use(authenticate);
router.use(requireRole('manager'));

function generateStaffCode(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const prefix = cleaned.padEnd(3, 'X').slice(0, 3);
    const suffix = Math.floor(10 + Math.random() * 90).toString();
    return `${prefix}${suffix}`;
}

async function createUniqueStaffCode(tenantId: string, name: string): Promise<string> {
    for (let i = 0; i < 5; i += 1) {
        const code = generateStaffCode(name);
        const exists = await db.get(
            'SELECT 1 FROM users WHERE tenant_id = ? AND staff_code = ?',
            [tenantId, code]
        );
        if (!exists) return code;
    }
    throw new Error('Unable to allocate staff code');
}

router.post('/', async (req, res) => {
    try {
        const { businessName, businessCode } = req.body;

        // 1. Create Drive Folder (Root for tenant)
        // For now, putting it in Shared Drive Root
        const folderId = await drive.createFolder(env.LEDGERSNAP_SHARED_DRIVE_ID, `LedgerSnap_${businessCode}`);

        // 2. Create Spreadsheet
        const spreadsheetId = await sheets.createSpreadsheet(`LedgerSnap_MASTER_${businessCode}`, folderId);

        // 3. Setup Tabs
        await sheets.ensureTabs(spreadsheetId, ['STAFF', 'COUNTERS', 'AUDIT_LOG']);

        // 4. Save to DB
        await db.run(`
          INSERT INTO tenants (tenant_id, business_code, business_name, master_spreadsheet_id, drive_root_folder_id)
          VALUES (?, ?, ?, ?, ?)
        `, [crypto.randomUUID(), businessCode, businessName, spreadsheetId, folderId]);

        res.json({ folderId, spreadsheetId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/users', async (req, res) => {
    const user = (req as AuthRequest).user!;
    try {
        const rows = await db.query(
            `SELECT user_id, tenant_id, email, staff_code, role, status, name
             FROM users
             WHERE tenant_id = ?
             ORDER BY created_at DESC`,
            [user.tenantId]
        );
        res.json({ users: rows });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/users/:userId/status', async (req, res) => {
    const manager = (req as AuthRequest).user!;
    const { userId } = req.params as { userId: string };
    const { status } = req.body as { status?: 'active' | 'disabled' };

    if (!status || (status !== 'active' && status !== 'disabled')) {
        return res.status(400).json({ error: 'status must be active or disabled' });
    }

    try {
        const target = await db.get(
            'SELECT user_id, tenant_id, role, status FROM users WHERE user_id = ?',
            [userId]
        );
        if (!target || target.tenant_id !== manager.tenantId) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (target.user_id === manager.userId && status === 'disabled') {
            return res.status(400).json({ error: 'You cannot disable your own account' });
        }

        await db.run(
            'UPDATE users SET status = ? WHERE user_id = ?',
            [status, userId]
        );

        res.json({ status: 'ok' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/invite', async (req, res) => {
    const manager = (req as AuthRequest).user!;
    const { email, name, role } = req.body as { email?: string; name?: string; role?: 'staff' | 'manager' };

    if (!email || !name) {
        return res.status(400).json({ error: 'email and name are required' });
    }

    if (role && role !== 'staff' && role !== 'manager') {
        return res.status(400).json({ error: 'Invalid role' });
    }

    try {
        const existing = await db.get(
            'SELECT 1 FROM users WHERE tenant_id = ? AND email = ?',
            [manager.tenantId, email]
        );
        if (existing) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const userId = crypto.randomUUID();
        const staffCode = await createUniqueStaffCode(manager.tenantId, name);
        const userRole = role || 'staff';

        await db.run(
            `INSERT INTO users (user_id, tenant_id, email, staff_code, role, status, name)
             VALUES (?, ?, ?, ?, ?, 'active', ?)`,
            [userId, manager.tenantId, email, staffCode, userRole, name]
        );

        const magic = await issueMagicLink(userId, email);
        res.json({
            user: {
                userId,
                tenantId: manager.tenantId,
                email,
                staffCode,
                role: userRole,
                name,
            },
            ...magic,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
