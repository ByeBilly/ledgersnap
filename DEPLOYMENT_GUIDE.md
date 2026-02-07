# Deployment Guide

## Backend
1. Set environment variables:
   - `PORT`
   - `APP_BASE_URL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `MAGIC_LINK_TTL_MINUTES`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `LEDGERSNAP_SHARED_DRIVE_ID`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Start: `npm run start`

## Frontend
1. Set environment variables:
   - `VITE_API_URL`
   - `GEMINI_API_KEY`
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Deploy `dist/` to static host.

## Google Cloud
- Enable Google Drive API and Google Sheets API.
- Use a Service Account with access to the Shared Drive.
- Set `LEDGERSNAP_SHARED_DRIVE_ID` to the Shared Drive ID.

## Notes
- In production, magic link tokens are emailed (no token in response).
- Ensure backend and frontend origins match `APP_BASE_URL`.

