import { google, type Auth } from 'googleapis';
import { Readable } from 'stream';
import { logger } from './logger';

function getAuth(): Auth.JWT {
  const clientEmail = process.env['GOOGLE_DRIVE_CLIENT_EMAIL'];
  const privateKey = process.env['GOOGLE_DRIVE_PRIVATE_KEY'];

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY must be set');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

function getFolderId(): string {
  const id = process.env['GOOGLE_DRIVE_FOLDER_ID'];
  if (!id) throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set');
  return id;
}

export async function uploadToGoogleDrive(
  filename: string,
  data: Buffer,
): Promise<{ fileId: string; size: number }> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const stream = new Readable();
  stream.push(data);
  stream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [getFolderId()],
    },
    media: {
      mimeType: 'application/octet-stream',
      body: stream,
    },
    fields: 'id,size',
  });

  const fileId = response.data.id;
  if (!fileId) throw new Error('Google Drive upload failed — no file ID returned');

  logger.info('Backup uploaded to Google Drive', { fileId, filename });
  return { fileId, size: data.length };
}

export async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function listBackupFiles(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: `'${getFolderId()}' in parents and trashed = false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 20,
  });

  return (response.data.files ?? []).map((f) => ({
    id: f.id ?? '',
    name: f.name ?? '',
    createdTime: f.createdTime ?? '',
  }));
}
