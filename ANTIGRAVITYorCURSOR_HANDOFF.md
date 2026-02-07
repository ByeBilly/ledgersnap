# LedgerSnap – Antigravity Technical Handoff
**Version: v1.4**
**Last Updated: 2024-05-24**

## 1. Project Purpose
LedgerSnap is a mobile-first PWA designed for "Turner Installs" and similar multi-tenant business environments. It captures receipts (images) and bank statements (CSV/PDF) and pipes them into an immutable, append-only ledger hosted on Google Sheets. It follows a "Staff Submit-Only" model where field workers can record data even when offline, while Managers oversee the ledger. Ownership of data rests entirely within the business's own Google Workspace via a Service Account.

## 2. System Architecture Overview
- **Frontend Stack:** React 19, Tailwind CSS, Lucide Icons, ESM modules. (IMPLEMENTED)
- **Backend Stack:** Node.js (Conceptualized in `backend/googleService.ts`, NOT IMPLEMENTED).
- **Storage:** 
  - **Local:** IndexedDB (Outbox for offline reliability). (IMPLEMENTED)
  - **Cloud:** Google Drive (Binary storage), Google Sheets (Transactional Ledger). (PLANNED)
- **AI Engine:** Google Gemini 3 Flash (Client-side implementation in `services/gemini.ts`). (IMPLEMENTED)
- **Offline Model:** Uses an "Outbox" pattern. Captures are stored as Blobs in IndexedDB and synced via a retry loop in `App.tsx`. (IMPLEMENTED)

### Request Flow Diagram
```text
[Client PWA] --(Blob + JSON)--> [IndexedDB Outbox]
      |                               |
 (Online?) --(POST Request)--> [Backend Bridge (Node.js)]
                                      |
                       [Google Auth (Service Account)]
                               /              \
                   [Google Drive]        [Google Sheets]
                  (Archive Files)      (Append Transactions)
```

## 3. Google Workspace Model
- **Ownership:** A centralized Service Account manages assets on a per-tenant basis.
- **Root Partitioning:** Every tenant has a root folder: `LedgerSnap_<business_code>`.
- **Ledger:** A single Google Spreadsheet `LedgerSnap_MASTER_<business_code>` acts as the database.
- **Monthly Tabs:** System is designed to create tabs based on YYYY-MM (e.g., `2024-05_Receipts_MASTER`).
- **Immutability:** Service Account is the only writer. Sheets are "Append-Only". Frontend has no "Delete" or "Edit" capability for recorded items.

## 4. Data Models
### User
- `id`: UUID
- `tenant_id`: Partition identifier
- `business_code`: 3-letter + 3-digit code (e.g., TUR102)
- `role`: `staff` | `manager`

### Receipt Schema (Sheets Column Mapping)
- `receipt_id`: `RC-<BIZ>-<STAFF>-<YYYYMM>-<ID>`
- `merchant`, `total`, `gst_amount`, `receipt_date`, `drive_file_id`, `status`

### Transaction Schema (Bank CSV)
- `txn_date`, `description`, `debit`, `credit`, `balance`, `category_guess`

## 5. API Endpoints
| Endpoint | Method | Status | Purpose |
| :--- | :--- | :--- | :--- |
| `/auth/magic-link` | POST | **NOT IMPLEMENTED** | Send login link to email |
| `/auth/verify` | GET | **STUBBED** | Verify JWT from link |
| `/provision` | POST | **STUBBED** | Create Google assets for new tenant |
| `/submit` | POST | **STUBBED/SIMULATED** | Upload file to Drive & Append to Sheet |
| `/history` | GET | **STUBBED** | Fetch ledger rows for user |

## 6. Offline Queue Design
- **Storage:** `IDBDatabase` with stores `outbox_queue` and `submissions_cache`. (IMPLEMENTED)
- **Lifecycle:** `QUEUED` -> `UPLOADING` -> `SUBMITTED` (or `FAILED`). (IMPLEMENTED)
- **Idempotency:** Client generates a UUID `idempotency_key` at capture time. Backend must check this against the Sheets `idempotency_key` column before appending. (IMPLEMENTED - CLIENT SIDE)
- **Retry:** `App.tsx` triggers `syncOutbox` on `online` events with 2s simulation delay. (IMPLEMENTED)

## 7. Security Model
- **Magic Links:** System is designed to be passwordless. Authenticated via signed JWTs. (STUBBED)
- **Role Enforcement:** `manager` role is required to access the `ManagerView`. (IMPLEMENTED)
- **Direct Access:** **CRITICAL:** Frontend NEVER talks to Google APIs directly. All traffic must pass through the Backend Bridge to keep Service Account keys secret.
- **Image Stripping:** `services/image.ts` compresses images to WebP and strips metadata before queuing. (IMPLEMENTED)

## 8. Reliability & Safeguards
- **Counter Atomicity:** Currently relies on client-side UUID generation. Final production build requires a backend sequential counter. (PARTIAL)
- **Backoff:** Sync loop handles failures by marking items `FAILED`, allowing manual or automatic retry. (IMPLEMENTED)
- **No-Edit Policy:** Corrections are handled by submitting a new record with a note referencing the original ID. (IMPLEMENTED)

## 9. Current Implementation State
- [x] **PWA UI:** (IMPLEMENTED) All primary screens (Capture, History, Manager, Settings, Outbox, Onboarding).
- [x] **AI Extraction:** (IMPLEMENTED) Gemini 3 Flash integrated for Receipts and CSV Statements.
- [x] **Offline Outbox:** (IMPLEMENTED) Fully functional IndexedDB persistence.
- [x] **CSV Parser:** (IMPLEMENTED) Robust parser handling quoted bank narratives.
- [x] **Image Pipeline:** (IMPLEMENTED) WebP compression (<500KB per snap).
- [ ] **Auth System:** (STUBBED) UI exists, but no functional Magic Link backend.
- [ ] **Backend Bridge:** (PARTIAL) Logic exists in `backend/googleService.ts` but requires Node.js hosting.
- [ ] **PDF Support:** (STUBBED) PDF capture UI is ready, but extraction logic is a stub.

## 10. Immediate Next Engineering Tasks
1. **Express Server Setup:** Convert `backend/googleService.ts` into a functional Node.js server.
2. **Real Sync:** Replace the simulation in `App.tsx` `syncOutbox` with real `fetch` calls to the Node server.
3. **Identity:** Implement the `POST /auth/verify` logic to populate the `User` object from a JWT.
4. **Sheets Logic:** Implement the `appendToLedger` function to actually write to the Google Sheet.

## 11. Assumptions & Constraints
- **Sheets Limit:** 10 million cells. Large businesses will eventually need migration to BigQuery.
- **Latency:** AI extraction takes 3-7 seconds. UI uses `Loader2` during this phase.
- **Quotas:** Gemini Free Tier may hit rate limits; production requires paid API keys.

## 12. Development Environment Setup
- **Env Vars:** `process.env.API_KEY` (Gemini).
- **Commands:** `npm install`, `npm run dev`.
- **Google Setup:** Create Service Account, grant "Editor" on a shared Drive, set `GOOGLE_APPLICATION_CREDENTIALS`.