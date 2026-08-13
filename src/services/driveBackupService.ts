import config from '../../firebase-applet-config.json';

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  mimeType: string;
}

const FOLDER_NAME = 'BEANNEL BUSINESS BACKUPS';
const OAUTH_CLIENT_ID = config.oAuthClientId || '';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

// Token state in memory
let accessToken: string | null = null;
let tokenExpirationTime = 0;

export function isDriveConnected(): boolean {
  if (!accessToken) {
    const stored = sessionStorage.getItem('gdrive_access_token');
    const exp = sessionStorage.getItem('gdrive_token_exp');
    if (stored && exp && Date.now() < Number(exp)) {
      accessToken = stored;
      tokenExpirationTime = Number(exp);
      return true;
    }
    return false;
  }
  return Date.now() < tokenExpirationTime;
}

export function disconnectDrive(): void {
  accessToken = null;
  tokenExpirationTime = 0;
  sessionStorage.removeItem('gdrive_access_token');
  sessionStorage.removeItem('gdrive_token_exp');
}

/**
 * Initiates GIS OAuth token client popup to authorize Google Drive
 */
export async function authenticateGoogleDrive(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isDriveConnected() && accessToken) {
      return resolve(accessToken);
    }

    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      return reject(
        new Error('Google Identity Services script not loaded. Please check your internet connection.')
      );
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPE,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`Google Auth error: ${response.error_description || response.error}`));
            return;
          }
          if (response.access_token) {
            accessToken = response.access_token;
            // Token typically valid for 3600 seconds
            const expiresIn = (response.expires_in || 3600) * 1000;
            tokenExpirationTime = Date.now() + expiresIn - 60000; // 1 min buffer
            sessionStorage.setItem('gdrive_access_token', accessToken!);
            sessionStorage.setItem('gdrive_token_exp', tokenExpirationTime.toString());
            resolve(accessToken!);
          } else {
            reject(new Error('No access token received from Google'));
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err.message || 'OAuth popup window closed or failed'));
        },
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      reject(new Error(`Failed to initialize OAuth client: ${err.message}`));
    }
  });
}

/**
 * Finds or creates a folder by name inside parentFolderId
 */
async function getOrCreateFolder(folderName: string, parentId?: string, token?: string): Promise<string> {
  const authHeader = `Bearer ${token || accessToken}`;
  let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name)`,
    {
      headers: { Authorization: authHeader },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Failed to query Google Drive folder: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    body.parents = [parentId];
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder "${folderName}": ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Resolves or creates the nested hierarchy: BEANNEL BUSINESS BACKUPS / YYYY / MM
 */
async function getBackupDestinationFolderId(token: string): Promise<string> {
  const rootFolderId = await getOrCreateFolder(FOLDER_NAME, undefined, token);

  const now = new Date();
  const yearStr = now.getFullYear().toString();
  const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');

  const yearFolderId = await getOrCreateFolder(yearStr, rootFolderId, token);
  const monthFolderId = await getOrCreateFolder(monthStr, yearFolderId, token);

  return monthFolderId;
}

/**
 * Uploads a versioned JSON backup file to Google Drive
 */
export async function uploadBackupToDrive(
  filename: string,
  jsonData: object
): Promise<{ fileId: string; filename: string; createdTime: string }> {
  const token = await authenticateGoogleDrive();
  const folderId = await getBackupDestinationFolderId(token);

  const jsonStr = JSON.stringify(jsonData, null, 2);
  const metadata = {
    name: filename,
    mimeType: 'application/json',
    parents: [folderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([jsonStr], { type: 'application/json' }));

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed: ${errText}`);
  }

  const result = await res.json();
  return {
    fileId: result.id,
    filename: result.name,
    createdTime: result.createdTime || new Date().toISOString(),
  };
}

/**
 * Lists all JSON backup files across the BEANNEL BUSINESS BACKUPS tree
 */
export async function listDriveBackups(): Promise<DriveBackupFile[]> {
  const token = await authenticateGoogleDrive();

  // Search for files containing .json in name or mimeType application/json
  const q = `mimeType='application/json' and name contains 'BEANNEL_BACKUP' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&orderBy=createdTime desc&pageSize=100&fields=files(id, name, createdTime, size, mimeType)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list Google Drive backups: ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads a backup JSON payload from Google Drive by fileId
 */
export async function downloadDriveBackup(fileId: string): Promise<any> {
  const token = await authenticateGoogleDrive();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download backup content: ${errText}`);
  }

  return await res.json();
}

/**
 * Deletes a backup file from Google Drive by fileId
 */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  const token = await authenticateGoogleDrive();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Failed to delete backup file: ${errText}`);
  }
}
