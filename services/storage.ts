
import { Submission, OutboxItem, SubmissionStatus } from '../types';

const DB_NAME = 'LedgerSnapDB';
const DB_VERSION = 1;
const OUTBOX_STORE = 'outbox_queue';
const CACHE_STORE = 'submissions_cache';

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addToOutbox(item: OutboxItem): Promise<void> {
    if (!this.db) await this.init();
    await this.perform<IDBValidKey>('readwrite', OUTBOX_STORE, (store) => store.add(item));
  }

  async getOutbox(): Promise<OutboxItem[]> {
    if (!this.db) await this.init();
    return this.perform('readonly', OUTBOX_STORE, (store) => store.getAll());
  }

  async removeFromOutbox(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.perform('readwrite', OUTBOX_STORE, (store) => store.delete(id));
  }

  async updateOutboxStatus(id: string, status: SubmissionStatus, error?: string): Promise<void> {
    if (!this.db) await this.init();
    const item = await this.perform<OutboxItem | undefined>('readonly', OUTBOX_STORE, (store) => store.get(id));
    if (item) {
      item.status = status;
      item.last_attempt_at = Date.now();
      if (status === SubmissionStatus.UPLOADING) {
        item.attempt_count += 1;
      }
      if (error) item.error = error;
      await this.perform<IDBValidKey>('readwrite', OUTBOX_STORE, (store) => store.put(item));
    }
  }

  async cacheSubmissions(submissions: Submission[]): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(CACHE_STORE, 'readwrite');
      const store = tx.objectStore(CACHE_STORE);
      store.clear();
      submissions.forEach(s => store.add(s));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedSubmissions(): Promise<Submission[]> {
    if (!this.db) await this.init();
    return this.perform('readonly', CACHE_STORE, (store) => store.getAll());
  }

  private perform<T>(mode: IDBTransactionMode, storeName: string, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = action(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const storage = new StorageService();
