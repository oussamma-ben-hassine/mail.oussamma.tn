import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebmailService } from './webmail.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';
import {
  ListMessagesQuery,
  ListMessagesResponse,
  MailDetail,
  SendWebmailPayload,
} from '@mail/contracts';

@ApiTags('Webmail Utilisateur')
@ApiBearerAuth()
@Controller('api/v1/webmail')
@UseGuards(SsoAuthGuard)
export class WebmailController {
  constructor(private readonly webmailService: WebmailService) {}

  @Get('folders')
  @ApiOperation({ summary: 'Lister les dossiers de messagerie (INBOX, SENT, TRASH, etc.)' })
  async listFolders(@Req() req: any, @Query('mailboxId') mailboxId?: string) {
    return this.webmailService.listFolders(req.user.id, mailboxId);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Lister les messages d’un dossier avec pagination et filtres' })
  async listMessages(
    @Req() req: any,
    @Query() query: ListMessagesQuery,
    @Query('mailboxId') mailboxId?: string
  ): Promise<ListMessagesResponse> {
    return this.webmailService.listMessages(req.user.id, query, mailboxId);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Consulter le détail d’un email avec sanitisation HTML stricte' })
  async getMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Query('folder') folder: string = 'INBOX',
    @Query('mailboxId') mailboxId?: string
  ): Promise<MailDetail> {
    return this.webmailService.getMessage(req.user.id, folder, id, mailboxId);
  }

  @Post('send')
  @ApiOperation({ summary: 'Envoyer un nouvel email depuis le Webmail' })
  async sendEmail(
    @Req() req: any,
    @Body() payload: SendWebmailPayload
  ) {
    return this.webmailService.sendWebmail(req.user.id, payload);
  }

  @Post('move')
  @ApiOperation({ summary: 'Déplacer un message vers un autre dossier' })
  async moveMessage(
    @Req() req: any,
    @Body() body: { folder: string; messageId: string; targetFolder: string; mailboxId?: string }
  ) {
    return this.webmailService.moveMessage(req.user.id, body.folder, body.messageId, body.targetFolder, body.mailboxId);
  }

  @Post('flag')
  @ApiOperation({ summary: 'Modifier les indicateurs d’un message (lu/non lu, favori)' })
  async setFlags(
    @Req() req: any,
    @Body() body: { folder: string; messageId: string; flags: { read?: boolean; starred?: boolean }; mailboxId?: string }
  ) {
    return this.webmailService.setFlags(req.user.id, body.folder, body.messageId, body.flags, body.mailboxId);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Supprimer un email (déplacement vers la corbeille ou suppression définitive)' })
  async deleteMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Query('folder') folder: string = 'INBOX',
    @Query('mailboxId') mailboxId?: string
  ) {
    return this.webmailService.deleteMessage(req.user.id, folder, id, mailboxId);
  }
}
