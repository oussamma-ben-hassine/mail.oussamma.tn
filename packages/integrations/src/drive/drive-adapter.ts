export interface DriveConfig {
  baseUrl: string;
  mockMode?: boolean;
}

export interface DriveFileSummary {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  download_url?: string;
  created_at?: string;
}

export interface CreateShareLinkOptions {
  fileId: string;
  expiresInDays?: number;
  password?: string;
  allowDownload?: boolean;
}

export class DriveAdapter {
  private baseUrl: string;
  private mockMode: boolean;

  constructor(config: DriveConfig) {
    this.baseUrl = (config.baseUrl || 'https://drive.oussamma.tn').replace(/\/+$/, '');
    this.mockMode = Boolean(config.mockMode);
  }

  /**
   * Save an email attachment into user's ByteVault Drive
   */
  public async saveAttachmentToDrive(
    userToken: string,
    fileBuffer: Buffer | Uint8Array,
    fileName: string,
    mimeType: string
  ): Promise<DriveFileSummary> {
    if (this.mockMode) {
      return {
        id: `mock-drive-${Date.now()}`,
        name: fileName,
        size: fileBuffer.length,
        mime_type: mimeType,
        download_url: `${this.baseUrl}/api/files/mock-drive-${Date.now()}/download`,
      };
    }

    const formData = new FormData();
    const blob = new Blob([fileBuffer as any], { type: mimeType });
    formData.append('files', blob, fileName);

    const res = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive upload failed (${res.status}): ${err}`);
    }

    const files = await res.json();
    return Array.isArray(files) ? files[0] : files;
  }

  /**
   * Create an expiring public share link for a file
   */
  public async createShareLink(userToken: string, options: CreateShareLinkOptions): Promise<{ shareUrl: string; shareId: string }> {
    if (this.mockMode) {
      const mockId = Math.random().toString(36).substring(2, 10);
      return {
        shareUrl: `${this.baseUrl}/s/${mockId}`,
        shareId: mockId,
      };
    }

    const res = await fetch(`${this.baseUrl}/api/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        file_id: options.fileId,
        expires_in_days: options.expiresInDays || 7,
        password: options.password,
        allow_download: options.allowDownload ?? true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive share creation failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      shareUrl: `${this.baseUrl}/s/${data.id}`,
      shareId: data.id,
    };
  }

  /**
   * Fetch user storage quota stats
   */
  public async getStorageStats(userToken: string): Promise<{ storageUsed: number; storageLimit: number; percentage: number }> {
    if (this.mockMode) {
      return { storageUsed: 150000000, storageLimit: 5000000000, percentage: 3 };
    }

    const res = await fetch(`${this.baseUrl}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });

    if (!res.ok) {
      return { storageUsed: 0, storageLimit: 2147483648, percentage: 0 };
    }

    const data = await res.json();
    return {
      storageUsed: data.storage_used || 0,
      storageLimit: data.storage_limit || 2147483648,
      percentage: data.percentage || 0,
    };
  }
}
