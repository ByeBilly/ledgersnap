# LedgerSnap Project Journal
**Version: 1.4.0**

## 1. Current Goal (1-3 sentences)
Complete the production-hardened PWA frontend for LedgerSnap, ensuring multi-tenant onboarding and multi-format (Image/CSV/PDF) capture are robust. Prepare for backend integration of the Google Drive and Sheets append-only ledger logic while maintaining strict documentation governance.

## 2. Decisions Locked In
- **Multi-tenant isolation:** Every business gets a unique `business_code` and its own root Google Drive folder and Master Sheet.
- **Append-only ledger:** Records are never deleted or updated; corrections are handled via `supersedes_id` in new rows.
- **Client-side compression:** All images are converted to WebP (<500KB) before entering the outbox.
- **Idempotency:** `idempotency_key` (UUID) is mandatory for every submission to prevent duplicates during offline retries.
- **Gemini for mapping:** Using `gemini-3-flash-preview` to map inconsistent CSV headers to the standard Transaction schema.
- **Documentation Governance:** Mandatory updates to JOURNAL.md, STATUS_REPORT.md, and ANTIGRAVITY_HANDOFF.md on every change.

## 3. Architecture Overview
- **Frontend:** React + Tailwind + Lucide + IndexedDB.
- **Backend (Planned):** Node.js + Express + Google SDK + Service Account.
- **Google Tier:** Shared Drive folders for binary storage, Google Sheets for the transactional ledger.

## 4. Google Assets Provisioning
- **Root Folder:** `/LedgerSnap/<business_code>/`
- **Subfolders:** Generated monthly: `/LedgerSnap/<business_code>/YYYY-MM/`
- **Master Sheet:** `LedgerSnap_MASTER_<business_code>`
- **Permissions:** Shared with Service Account email; private to the business otherwise.

## 5. Data Schemas
### Receipts Tab
- `receipt_id`, `idempotency_key`, `business_code`, `staff_code`, `submitted_at_utc`, `total`, `gst_amount`, `merchant`, `category_guess`, `drive_file_id`, `notes`, `status`.
### Transactions Tab
- `txn_id`, `txn_date`, `description`, `debit`, `credit`, `balance`, `category_guess`, `source_drive_file_id`, `status`.

## 6. API Endpoints
- `POST /auth/request-link` (Planned)
- `GET /auth/verify` (Planned)
- `POST /receipts` (Stubbed in Frontend Sync)
- `POST /statements` (Stubbed in Frontend Sync)
- `GET /provision` (Simulated in Onboarding)

## 7. Frontend Screens
- **Onboarding:** Business name -> Security Rules -> Auto-provisioning simulation. (IMPLEMENTED)
- **Capture:** Camera snap, File upload (CSV/PDF), AI preview & review. (IMPLEMENTED)
- **Outbox:** Local queue management for offline-first reliability. (IMPLEMENTED)
- **History:** Local cache of submitted items. (IMPLEMENTED)
- **Manager:** Overview stats, review queue, and export tools. (IMPLEMENTED)

## 8. Offline Queue Design
- **Storage:** IndexedDB store `outbox_queue`.
- **Items:** Blobs + JSON data + Idempotency keys.
- **Sync Logic:** Exponential backoff retries when `navigator.onLine` is true.

## 9. Security Checklist
- [x] No passwords (Magic Links only)
- [x] Client-side image stripping/compression
- [x] Idempotent write headers
- [ ] JWT session hardening (Backend)
- [ ] Rate limiting (Backend)

## 10. Quotas/Reliability
- **Retry Policy:** Initial 5s, doubling up to 10 mins.
- **Batching:** Planned batch updates for bank statement CSV rows to minimize Sheets API calls.

## 11. Known Issues / Risks
- **PDF Extraction:** PDF text extraction is currently a stub; requires a PDF.js worker or backend processing.
- **Race Conditions:** Counter atomicity depends on backend DB transactions; Sheets alone cannot guarantee sequential IDs under high concurrency.

## 12. Next Tasks
- [ ] Implement actual Node.js backend bridge for Google APIs.
- [ ] Connect the `syncOutbox` logic to real API endpoints instead of stubs.
- [ ] Add PDF text extraction logic (Gemini vision on first page or text parser).
- [ ] Finalize the 'Review Required' flow for low-confidence AI extractions.

## 13. Change Log
- **2024-05-24:** Initial PWA architecture with IndexedDB outbox.
- **2024-05-24:** Multi-tenant onboarding flow and Google provisioning simulation.
- **2024-05-24:** Added CSV support and refined Gemini bank mapping logic.
- **2024-05-24:** Added `JOURNAL.md` and `STATUS_REPORT.md`.
- **2024-05-24:** Created `ANTIGRAVITY_HANDOFF.md` for technical continuation.
- **2024-05-24:** **v1.4.0**: Implemented Documentation Governance (Rule 1-7). Updated all MD files to reflect current build state with required labels.

## 14. Questions / Assumptions
- **Assumption:** Service Account has broad enough permissions to create folders on the fly.
- **Question:** Should we allow staff to delete their own *queued* items before they reach the server? (Current: Yes, via Outbox).