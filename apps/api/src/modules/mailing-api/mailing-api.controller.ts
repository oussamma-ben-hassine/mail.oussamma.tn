import { Controller, Post, Get, Body, Param, Query, Headers, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { MailingApiService } from './mailing-api.service.js';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { SendEmailRequest, BatchSendEmailRequest, EmailResponse, EmailEventResponse } from '@mail/contracts';

@ApiTags('Mailing Transactionnel (v1)')
@ApiSecurity('ApiKeyAuth')
@Controller('api/v1')
@UseGuards(ApiKeyGuard)
export class MailingApiController {
  constructor(private readonly mailingService: MailingApiService) {}

  @Post('emails')
  @ApiOperation({ summary: 'Envoyer un email transactionnel (machine-to-machine)' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Clé unique évitant les envois multiples' })
  @ApiResponse({ status: 201, description: 'Email mis en file d’attente avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation ou quota dépassé' })
  @ApiResponse({ status: 403, description: 'Scope ou domaine expéditeur non autorisé' })
  async sendEmail(
    @Req() req: any,
    @Body() payload: SendEmailRequest,
    @Headers('idempotency-key') idempotencyKey?: string
  ): Promise<EmailResponse> {
    return this.mailingService.sendEmail(req.application, payload, idempotencyKey);
  }

  @Post('emails/batch')
  @ApiOperation({ summary: 'Envoyer un lot d’emails en une seule requête' })
  @ApiResponse({ status: 201, description: 'Emails mis en file d’attente' })
  async sendBatch(
    @Req() req: any,
    @Body() payload: BatchSendEmailRequest
  ): Promise<EmailResponse[]> {
    return this.mailingService.sendBatch(req.application, payload);
  }

  @Get('emails/:id')
  @ApiOperation({ summary: 'Consulter le statut d’un envoi d’email' })
  @ApiResponse({ status: 200, description: 'Statut du message retourné' })
  @ApiResponse({ status: 404, description: 'Message introuvable' })
  async getEmailById(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<EmailResponse> {
    return this.mailingService.getEmailById(id, req.application);
  }

  @Get('email-events')
  @ApiOperation({ summary: 'Lister les événements de livraison (delivered, bounced, opened)' })
  @ApiResponse({ status: 200, description: 'Liste des événements récents' })
  async getEmailEvents(
    @Query('jobId') jobId?: string,
    @Query('recipient') recipient?: string
  ) {
    return this.mailingService.getEmailEvents(jobId, recipient);
  }
}
