# LedgerSnap Status Report

## 1. Summary of What Exists Right Now
- **PWA Scaffold:** (IMPLEMENTED) Manifest, Service Worker (via metadata), and responsive mobile-first UI.
- **Onboarding:** (IMPLEMENTED) Fully interactive multi-step flow that "provisions" a new business workspace (Simulation).
- **Capture Engine:** 
  - **Image Compression:** (IMPLEMENTED) WebP and camera integration.
  - **CSV Parsing:** (IMPLEMENTED) Robust quoted-string support.
  - **Gemini Extraction (Receipts):** (IMPLEMENTED) OCR and JSON parsing.
  - **Gemini Extraction (CSV Bank Data):** (IMPLEMENTED) Column mapping and normalization.
  - **PDF Capture:** (PARTIAL) UI supports pick, but extraction logic is a STUB.
- **Offline Reliability:** (IMPLEMENTED) IndexedDB-backed "Outbox" that queues items and retries automatically when connectivity returns.
- **Immutable Logic:** (IMPLEMENTED) Frontend enforces review before submission; no edit/delete after "Record to Ledger" is pressed (only discard from outbox).

## 2. What Is Still Needed (Gap Analysis)
- **Real Backend:** (NOT IMPLEMENTED) Current sync logic is simulated with `setTimeout`. A Node.js server is needed to handle Service Account auth and Google API calls.
- **Auth Implementation:** (STUB) Magic link generation and JWT verification are stubs in the UI.
- **PDF Worker:** (NOT IMPLEMENTED) Real PDF text extraction is required for "Capture Statement" to work end-to-end.
- **Master Ledger View:** (PARTIAL) "History" and "Manager" views use local cache only; they need to fetch real-time data from the Google Sheet via the backend (NOT IMPLEMENTED).

## 3. Critical Path (Next 10 steps)
1. **Provisioning API:** (NOT IMPLEMENTED) Connect Onboarding to a backend endpoint that creates the Drive folder and Spreadsheet.
2. **Auth Flow:** (STUB) Implement the Magic Link emailer and session store.
3. **Upload Bridge:** (NOT IMPLEMENTED) Implement `POST /upload` which saves to Drive and returns the `file_id`.
4. **Extraction Pipeline:** (IMPLEMENTED - Frontend) Move Gemini logic to backend for security (Planned).
5. **Sheets Append:** (NOT IMPLEMENTED) Implement the append logic to Receipts/Transactions tabs.
6. **Counter API:** (NOT IMPLEMENTED) Implement the atomic counter in the backend DB for Receipt/Transaction IDs.
7. **History Sync:** (NOT IMPLEMENTED) Fetch the latest rows from Sheets to populate the frontend history.
8. **PDF Support:** (NOT IMPLEMENTED) Add PDF.js to the frontend to convert PDFs to images or extract text.
9. **Revision API:** (NOT IMPLEMENTED) Implement the Manager-only revision row logic.
10. **Hardening:** (PARTIAL) Add 401/403/429 error handling and retry logic to the frontend sync.

## 4. How to Run Locally
1. **Env Vars:** Ensure `process.env.API_KEY` is set for Gemini.
2. **Install:** `npm install`
3. **Start:** `npm run dev`
4. **PWA:** Open in Chrome and "Install" or use Mobile Emulation.

## 5. Verification Checklist
- [x] **Onboarding:** (IMPLEMENTED) Can you create a business and reach the "Snap" screen?
- [x] **Offline Capture:** (IMPLEMENTED) Capture a receipt while in "Flight Mode". Does it appear in the Outbox?
- [x] **Sync:** (STUB) Reconnect to WiFi. Does the Outbox item move to "Uploading" then "Submitted"?
- [x] **CSV Mapping:** (IMPLEMENTED) Upload a bank CSV. Does Gemini identify the transactions correctly?
- [x] **Image Size:** (IMPLEMENTED) Check logs. Is the photo compressed to <500KB WebP?