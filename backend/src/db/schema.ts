import type { Database } from './index';

export async function initSchema(db: Database) {
  console.log('🔄 Checking database schema...');

  const schemas = [
    `CREATE TABLE IF NOT EXISTS tenants (
      tenant_id TEXT PRIMARY KEY,
      business_code TEXT UNIQUE NOT NULL,
      business_name TEXT NOT NULL,
      master_spreadsheet_id TEXT,
      drive_root_folder_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      staff_code TEXT NOT NULL,
      role TEXT CHECK(role IN ('staff', 'manager')) NOT NULL DEFAULT 'staff',
      status TEXT DEFAULT 'active',
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )`,
    `CREATE TABLE IF NOT EXISTS magic_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS idempotency (
      idempotency_key TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_hash TEXT,
      result_json TEXT,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )`,
    `CREATE TABLE IF NOT EXISTS counters (
      tenant_id TEXT NOT NULL,
      staff_code TEXT NOT NULL,
      yyyymm TEXT NOT NULL,
      type TEXT NOT NULL,
      current_value INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (tenant_id, staff_code, yyyymm, type),
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
    )`,
    `CREATE TABLE IF NOT EXISTS submission_queue (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      result_json TEXT,
      next_attempt_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`
  ];

  try {
    for (const sql of schemas) {
      await db.exec(sql);
    }
    try {
      await db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
    } catch (err) {
      // Column exists or table not ready; safe to ignore
    }
    try {
      await db.exec(`ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
    } catch (err) {
      // Column exists or table not ready; safe to ignore
    }
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err);
  }
}
