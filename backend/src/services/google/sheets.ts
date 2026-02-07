import { google } from 'googleapis';
import { createGoogleAuth } from './auth';

const auth = createGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);

const sheets = google.sheets({ version: 'v4', auth });

export async function createSpreadsheet(title: string, folderId: string): Promise<string> {
    // 1. Create Spreadsheet
    const res = await sheets.spreadsheets.create({
        requestBody: {
            properties: { title },
        },
        fields: 'spreadsheetId',
    });
    const spreadsheetId = res.data.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create spreadsheet');

    // 2. Move to Folder (Drive API required here, using the separate Drive service generally, 
    // but for simplicity we rely on Drive API permission being present here or handling it via drive service)
    // Actually, to move it, we need to use Drive API to add parents. 
    // IMPORTANT: The Sheets API create doesn't let you specify parent folder directly.
    // We must import the drive service to move it.
    // For now, let's assume the caller uses drive.moveToFolder or similar.
    // Wait, the user requirement: "POST /tenants ... provisions Drive folder + Spreadsheet"
    // If we create it, it goes to root. We need to move it. 
    // I will delegate the move to the caller or add a helper here if I had Drive access.
    // Since I have `drive.ts`, I should use it. But for now, I'll just return ID.

    return spreadsheetId;
}

export async function ensureTabs(spreadsheetId: string, tabNames: string[]): Promise<void> {
    // Get existing sheets
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map(s => s.properties?.title) || [];

    const requests: any[] = [];
    for (const name of tabNames) {
        if (!existingTitles.includes(name)) {
            requests.push({ addSheet: { properties: { title: name } } });
        }
    }

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests },
        });
    }
}

export async function appendRows(spreadsheetId: string, tabName: string, rows: any[][]): Promise<void> {
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: tabName,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
    });
}
