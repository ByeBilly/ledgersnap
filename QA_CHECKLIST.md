# QA Checklist

## Auth
- Request magic link sends email
- Magic link verifies and returns JWT
- JWT required on protected endpoints

## Tenant Provisioning
- Provision creates Drive folder
- Provision creates Sheets master
- Manager user created and can sign in

## Staff Invite
- Invite creates user
- Invite email sends
- User can sign in
- Manager can enable/disable

## Receipts
- Receipt capture queues in outbox
- Outbox syncs when online
- Receipt appended to Sheets
- Drive file upload works

## Statements
- CSV parse to transactions
- Statement queued and processed
- Tabs created by month
- Rows appended to Sheets

## UI
- History displays status
- Outbox shows proper icons
- Team list displays users

## Reliability
- Idempotency prevents duplicates
- Retry and backoff work on failures

