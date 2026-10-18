import { Injectable } from '@nestjs/common';
import { MailAIService } from '@mail/integrations';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  SummarizeEmailPayload,
  ReplyDraftPayload,
  ExtractActionsPayload,
  AIActionResponse,
} from '@mail/contracts';

@Injectable()
export class AiService {
  private mailAiService: MailAIService;

  constructor(private prisma: PrismaService) {
    this.mailAiService = new MailAIService({
      baseUrl: process.env.LITELLM_BASE_URL || 'https://ai.oussamma.tn',
      apiKey: process.env.LITELLM_API_KEY || '',
      defaultModel: process.env.LITELLM_DEFAULT_MODEL || 'gpt-4o',
      fastModel: process.env.LITELLM_FAST_MODEL || 'gemini/gemini-3.1-flash-lite-preview',
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.LITELLM_API_KEY,
    });
  }

  async summarizeEmail(userId: string, payload: SummarizeEmailPayload): Promise<AIActionResponse> {
    const result = await this.mailAiService.summarizeEmail(payload.content, payload.language);

    // Audit de l'action IA
    await this.prisma.mailAiAction.create({
      data: {
        userId,
        actionType: result.actionType,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        inputSnippet: payload.content.substring(0, 200),
        resultSnippet: result.summary?.substring(0, 200),
      },
    });

    return result;
  }

  async generateReplyDraft(userId: string, payload: ReplyDraftPayload): Promise<AIActionResponse> {
    const result = await this.mailAiService.generateReplyDraft(
      payload.originalEmail,
      payload.userPrompt,
      payload.tone,
      payload.language
    );

    await this.prisma.mailAiAction.create({
      data: {
        userId,
        actionType: result.actionType,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        inputSnippet: payload.originalEmail.content.substring(0, 200),
        resultSnippet: result.suggestedDraft?.substring(0, 200),
        requiresConfirmation: true,
      },
    });

    return result;
  }

  async extractActions(userId: string, payload: ExtractActionsPayload): Promise<AIActionResponse> {
    const result = await this.mailAiService.extractActions(payload.emailContent);

    await this.prisma.mailAiAction.create({
      data: {
        userId,
        actionType: result.actionType,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        inputSnippet: payload.emailContent.substring(0, 200),
      },
    });

    return result;
  }

  async translateEmail(userId: string, content: string, targetLanguage: 'fr' | 'en' | 'ar'): Promise<{ translatedText: string }> {
    const translatedText = await this.mailAiService.translateEmail(content, targetLanguage);
    return { translatedText };
  }
}
