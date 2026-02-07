import sqlite3 from 'sqlite3';
import { env } from '../config/env';

// Allow verbose logging
if (env.NODE_ENV === 'development') {
    sqlite3.verbose();
}

const dbPath = env.SQLITE_PATH;

export class Database {
    private db: sqlite3.Database;

    constructor(path: string) {
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                console.error('❌ Could not connect to database', err);
            } else {
                console.log(`📦 Database connected at ${path}`);
                this.init();
            }
        });
    }

    private init() {
        this.db.serialize(() => {
            // Init schema here or call external init
            this.db.run("PRAGMA journal_mode = WAL");
            import('./schema.js').then(({ initSchema }) => {
                initSchema(this);
            });
        });
    }

    query(sql: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    get(sql: string, params: any[] = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    exec(sql: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

const db = new Database(dbPath);
export default db;
