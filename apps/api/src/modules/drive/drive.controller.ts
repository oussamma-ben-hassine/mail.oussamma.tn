import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DriveService } from './drive.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';

@ApiTags('Intégration ByteVault Drive')
@ApiBearerAuth()
@Controller('api/v1/drive')
@UseGuards(SsoAuthGuard)
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  @Post('share-link')
  @ApiOperation({ summary: 'Générer un lien de partage sécurisé ByteVault pour un fichier' })
  async createShareLink(
    @Req() req: any,
    @Body() body: { fileId: string; expiresInDays?: number; password?: string; allowDownload?: boolean }
  ) {
    return this.driveService.createShareLink(req.user.token, body);
  }

  @Get('storage-stats')
  @ApiOperation({ summary: 'Consulter l’espace utilisé et le quota ByteVault Drive de l’utilisateur' })
  async getStorageStats(@Req() req: any) {
    return this.driveService.getStorageStats(req.user.token);
  }
}
