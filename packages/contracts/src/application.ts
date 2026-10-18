import { z } from 'zod';
import { AppScope } from './enums.js';

export const CreateApplicationSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  allowedSenderDomains: z.array(z.string()).min(1),
  defaultFromEmail: z.string().email(),
  defaultFromName: z.string().max(100).optional(),
  dailyQuota: z.number().int().positive().default(1000),
  rateLimitPerMinute: z.number().int().positive().default(60),
  scopes: z.array(z.nativeEnum(AppScope)).default([
    AppScope.MAIL_SEND,
    AppScope.MAIL_READ_STATUS,
    AppScope.MAIL_TEMPLATES_READ,
  ]),
});

export type CreateApplicationRequest = z.infer<typeof CreateApplicationSchema>;

export const CreateCredentialSchema = z.object({
  label: z.string().min(2).max(100).default('Default API Key'),
  expiresInDays: z.number().int().positive().nullable().optional(),
});

export type CreateCredentialRequest = z.infer<typeof CreateCredentialSchema>;

export const ApplicationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  allowedSenderDomains: z.array(z.string()),
  defaultFromEmail: z.string(),
  defaultFromName: z.string().nullable().optional(),
  dailyQuota: z.number(),
  rateLimitPerMinute: z.number(),
  scopes: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ApplicationResponse = z.infer<typeof ApplicationResponseSchema>;

export const CredentialResponseSchema = z.object({
  id: z.string().uuid(),
  applicationId: z.string().uuid(),
  label: z.string(),
  keyPrefix: z.string(),
  apiKey: z.string().optional(), // Uniquement renvoyé lors de la création
  lastUsedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isRevoked: z.boolean(),
  createdAt: z.string(),
});

export type CredentialResponse = z.infer<typeof CredentialResponseSchema>;

export const ApplicationUsageResponseSchema = z.object({
  applicationId: z.string().uuid(),
  period: z.string(),
  sentToday: z.number().int(),
  dailyQuota: z.number().int(),
  remainingQuota: z.number().int(),
  sentThisMonth: z.number().int(),
  bouncesCount: z.number().int(),
  failedCount: z.number().int(),
  successRate: z.number(),
});

export type ApplicationUsageResponse = z.infer<typeof ApplicationUsageResponseSchema>;
