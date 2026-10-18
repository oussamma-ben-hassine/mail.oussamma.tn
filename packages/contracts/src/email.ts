import { z } from 'zod';
import { EmailDeliveryStatus, EmailPriority } from './enums.js';

export const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  content: z.string(), // Base64 encoded or URL
  contentType: z.string().default('application/octet-stream'),
  sizeBytes: z.number().int().nonnegative().optional(),
  driveFileId: z.string().uuid().optional(),
  isDriveLink: z.boolean().default(false),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

export const SendEmailSchema = z.object({
  from: z.string().email(),
  fromName: z.string().max(100).optional(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  replyTo: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  text: z.string().optional(),
  html: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.any()).optional(),
  priority: z.nativeEnum(EmailPriority).default(EmailPriority.NORMAL),
  attachments: z.array(AttachmentSchema).max(10).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  metadata: z.record(z.any()).optional(),
  headers: z.record(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
}).refine(data => data.text || data.html || data.templateId, {
  message: 'Au moins un contenu (text, html) ou un templateId doit être spécifié.',
});

export type SendEmailRequest = z.infer<typeof SendEmailSchema>;

export const BatchSendEmailSchema = z.object({
  emails: z.array(SendEmailSchema).min(1).max(100),
});

export type BatchSendEmailRequest = z.infer<typeof BatchSendEmailSchema>;

export const EmailResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.nativeEnum(EmailDeliveryStatus),
  from: z.string(),
  to: z.array(z.string()),
  subject: z.string(),
  priority: z.nativeEnum(EmailPriority),
  createdAt: z.string(),
  queuedAt: z.string().nullable().optional(),
  sentAt: z.string().nullable().optional(),
  failedAt: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  attemptsCount: z.number().int(),
  idempotencyKey: z.string().nullable().optional(),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;

export const EmailEventResponseSchema = z.object({
  id: z.string().uuid(),
  emailId: z.string().uuid(),
  eventType: z.string(),
  status: z.nativeEnum(EmailDeliveryStatus),
  recipient: z.string(),
  attemptNumber: z.number(),
  errorMessage: z.string().nullable().optional(),
  occurredAt: z.string(),
  metadata: z.record(z.any()).optional(),
});

export type EmailEventResponse = z.infer<typeof EmailEventResponseSchema>;
