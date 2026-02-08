# Project Memory Index

## 1. Project Overview
LedgerSnap is a mobile-first PWA for receipt and statement capture with offline-first reliability. The frontend handles capture, preview, and outbox syncing, while the backend processes uploads, calls Gemini for extraction, and appends records to Google Sheets with Drive storage.

## 2. Architecture Map
- Frontend responsibilities: capture images/CSV/PDF, local outbox, user flows, call backend APIs.
- Backend responsibilities: auth, queue processing, Gemini extraction, Google Drive/Sheets writes, staff management.
- Security boundary (what must never run in browser): all API keys, Gemini SDK usage, Google Service Account credentials.

## 3. Environment Variable Policy
- Frontend rules: ONLY VITE_* vars, no secrets.
- Backend secrets: server-only in backend/.env, never committed.
- API key placement rules: GEMINI_API_KEY must never be in frontend.

## 4. External Service Integrations
- Gemini integration rules (backend-only call pattern): frontend calls backend endpoints; backend holds GEMINI_API_KEY and calls Gemini.
- Google Drive/Sheets integration notes (if applicable): backend owns service account and writes to Drive/Sheets.

## 5. Git & Repository Discipline
- .gitignore policies (env + secrets + db files ignored): ignore .env, .env.local, backend/.env, backend/*.db, backend/.secrets.
- Database file handling: local SQLite files never committed.
- Secret handling + rotation rule if leaked: rotate any exposed keys immediately.

## 6. Current Known Issues
- Backend Gemini extraction routes not yet implemented for /api/extract-receipt and /api/map-bank.
- Dev requires valid backend secrets for provisioning and uploads.
- PDF extraction remains a stub.

## 7. Pending Tasks
- Implement backend Gemini routes and error handling.
- Ensure frontend extraction calls succeed against backend.

## 8. Session Log (Chronological — Append Only)

### 2026-02-07 13:40 (local)
- Summary: Established project memory file and captured current architecture and policy state.
- Decisions: Gemini must be backend-only; frontend uses VITE_API_URL for all API calls.
- Env/Secrets Policy State: Frontend contains ONLY VITE_* (no API keys); backend owns GEMINI_API_KEY; .gitignore protects env + secrets + sqlite artifacts.
- Git Hygiene State: .gitignore includes env, secrets, and db files.
- Open Issues: Backend Gemini extraction routes pending; PDF extraction stub.
- Next Steps: Add /api/extract-receipt and /api/map-bank in backend; verify frontend extraction flow.
