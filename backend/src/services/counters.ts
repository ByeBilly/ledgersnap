import db from '../db';

export async function getNextCounter(tenantId: string, staffCode: string, yyyymm: string, type: string = 'receipt'): Promise<number> {
    // 1. Ensure counter exists
    // We use INSERT OR IGNORE. 
    await db.run(`
    INSERT OR IGNORE INTO counters (tenant_id, staff_code, yyyymm, type, current_value)
    VALUES (?, ?, ?, ?, 0)
  `, [tenantId, staffCode, yyyymm, type]);

    // 2. Increment and get
    // Ideally this should be a transaction, but sqlite3 queues operations so this is "safe enough" for single instance
    await db.run(`
    UPDATE counters 
    SET current_value = current_value + 1, updated_at = CURRENT_TIMESTAMP
    WHERE tenant_id = ? AND staff_code = ? AND yyyymm = ? AND type = ?
  `, [tenantId, staffCode, yyyymm, type]);

    const row = await db.get(`
    SELECT current_value FROM counters
    WHERE tenant_id = ? AND staff_code = ? AND yyyymm = ? AND type = ?
  `, [tenantId, staffCode, yyyymm, type]);

    return (row as { current_value: number }).current_value;
}

export function generateReceiptId(businessCode: string, staffCode: string, yyyymm: string, counter: number): string {
    // Format: RC-TUR-JON-202405-0001
    const padded = counter.toString().padStart(4, '0');
    const monthStr = yyyymm.replace('-', '');
    return `RC-${businessCode}-${staffCode}-${monthStr}-${padded}`;
}
