import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';
import {
  SummarizeEmailPayload,
  ReplyDraftPayload,
  ExtractActionsPayload,
  AIActionResponse,
} from '@mail/contracts';

@ApiTags('Assistance IA (LiteLLM)')
@ApiBearerAuth()
@Controller('api/v1/ai')
@UseGuards(SsoAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  @ApiOperation({ summary: 'Résumer un email ou un fil de discussion via LiteLLM' })
  @ApiResponse({ status: 200, description: 'Résumé généré avec succès' })
  async summarizeEmail(
    @Req() req: any,
    @Body() payload: SummarizeEmailPayload
  ): Promise<AIActionResponse> {
    return this.aiService.summarizeEmail(req.user.id, payload);
  }

  @Post('reply-draft')
  @ApiOperation({ summary: 'Générer un projet de réponse contextualisé avec confirmation humaine explicite' })
  @ApiResponse({ status: 200, description: 'Proposition de réponse générée' })
  async generateReplyDraft(
    @Req() req: any,
    @Body() payload: ReplyDraftPayload
  ): Promise<AIActionResponse> {
    return this.aiService.generateReplyDraft(req.user.id, payload);
  }

  @Post('extract-actions')
  @ApiOperation({ summary: 'Extraire automatiquement les tâches et dates limites d’un email' })
  @ApiResponse({ status: 200, description: 'Actions et dates extraites' })
  async extractActions(
    @Req() req: any,
    @Body() payload: ExtractActionsPayload
  ): Promise<AIActionResponse> {
    return this.aiService.extractActions(req.user.id, payload);
  }

  @Post('translate')
  @ApiOperation({ summary: 'Traduire le contenu d’un email (Français, Anglais, Arabe)' })
  @ApiResponse({ status: 200, description: 'Texte traduit' })
  async translateEmail(
    @Req() req: any,
    @Body() body: { content: string; targetLanguage: 'fr' | 'en' | 'ar' }
  ) {
    return this.aiService.translateEmail(req.user.id, body.content, body.targetLanguage);
  }
}
