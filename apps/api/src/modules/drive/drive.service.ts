import { Injectable } from '@nestjs/common';
import { DriveAdapter } from '@mail/integrations';

@Injectable()
export class DriveService {
  private driveAdapter: DriveAdapter;

  constructor() {
    this.driveAdapter = new DriveAdapter({
      baseUrl: process.env.DRIVE_BASE_URL || 'https://drive.oussamma.tn',
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.DRIVE_BASE_URL,
    });
  }

  async saveAttachment(userToken: string, fileBuffer: Buffer, fileName: string, mimeType: string) {
    return this.driveAdapter.saveAttachmentToDrive(userToken, fileBuffer, fileName, mimeType);
  }

  async createShareLink(userToken: string, options: { fileId: string; expiresInDays?: number; password?: string; allowDownload?: boolean }) {
    return this.driveAdapter.createShareLink(userToken, options);
  }

  async getStorageStats(userToken: string) {
    return this.driveAdapter.getStorageStats(userToken);
  }
}
