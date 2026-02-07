# LedgerSnap

A production-hardened, multi-tenant PWA for universal business ledger capture.

## Documentation
- **[Project Journal](./JOURNAL.md):** Persistent memory, decision log, and prioritized tasks.
- **[Status Report](./STATUS_REPORT.md):** Gap analysis and critical path for the current build.

## Architecture
- **Multi-Tenant:** Businesses are partitioned by `tenant_id` and `business_code`.
- **Append-Only:** Immutable record-keeping using Google Sheets as the master ledger.
- **Offline-First:** High-reliability capture via IndexedDB-backed outbox.
- **AI Extraction:** Automated OCR and structured data extraction powered by Gemini 3 Flash.

## Setup Requirements

### 1. Google Cloud Platform
- Create a GCP project.
- Enable **Google Sheets API** and **Google Drive API**.
- Create a **Service Account** and download its credentials.
- The system automates folder and sheet creation on behalf of the tenant.

### 2. Environment Variables
```env
API_KEY=your_gemini_api_key
# The frontend uses process.env.API_KEY for real-time extraction
VITE_API_URL=http://localhost:3001
```

## Deployment
- **Frontend:** Deploy as a static site (Netlify, Vercel).
- **Backend:** Node.js environment (Railway, Heroku) to bridge Google APIs securely.
