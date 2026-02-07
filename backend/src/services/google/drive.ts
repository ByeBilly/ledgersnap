import { google } from 'googleapis';
import { Readable } from 'stream';
import { createGoogleAuth } from './auth';

const auth = createGoogleAuth(['https://www.googleapis.com/auth/drive.file']);

const drive = google.drive({ version: 'v3', auth });

export async function createFolder(parentId: string, name: string): Promise<string> {
    const res = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
        supportsAllDrives: true, // Required for Shared Drives
    });
    if (!res.data.id) throw new Error('Failed to create folder');
    return res.data.id;
}

export async function uploadFile(
    folderId: string,
    buffer: Buffer,
    mimeType: string,
    fileName: string
): Promise<string> {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: stream,
        },
        fields: 'id',
        supportsAllDrives: true,
    });

    if (!res.data.id) throw new Error('Failed to upload file');
    return res.data.id;
}
