import { z } from 'zod';
import { AIActionType } from './enums.js';

export const SummarizeEmailPayloadSchema = z.object({
  emailId: z.string(),
  content: z.string().min(1),
  language: z.enum(['fr', 'en', 'ar']).default('fr'),
});

export type SummarizeEmailPayload = z.infer<typeof SummarizeEmailPayloadSchema>;

export const ReplyDraftPayloadSchema = z.object({
  originalEmail: z.object({
    from: z.string(),
    subject: z.string(),
    content: z.string(),
  }),
  userPrompt: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'concise', 'detailed']).default('professional'),
  language: z.enum(['fr', 'en', 'ar']).default('fr'),
});

export type ReplyDraftPayload = z.infer<typeof ReplyDraftPayloadSchema>;

export const ActionItemSchema = z.object({
  task: z.string(),
  deadline: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

export const ExtractActionsPayloadSchema = z.object({
  emailContent: z.string().min(1),
});

export type ExtractActionsPayload = z.infer<typeof ExtractActionsPayloadSchema>;

export const AIActionResponseSchema = z.object({
  actionType: z.nativeEnum(AIActionType),
  summary: z.string().optional(),
  suggestedDraft: z.string().optional(),
  actions: z.array(ActionItemSchema).optional(),
  extractedDates: z.array(z.string()).optional(),
  modelUsed: z.string(),
  tokensUsed: z.number().int().optional(),
  requiresConfirmation: z.boolean().default(false),
});

export type AIActionResponse = z.infer<typeof AIActionResponseSchema>;
