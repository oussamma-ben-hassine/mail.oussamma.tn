import { z } from 'zod';
import { MailboxFolderType } from './enums.js';

export const MailFolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.nativeEnum(MailboxFolderType),
  unreadCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  delimiter: z.string().default('/'),
});

export type MailFolder = z.infer<typeof MailFolderSchema>;

export const MailParticipantSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
});

export type MailParticipant = z.infer<typeof MailParticipantSchema>;

export const MailHeaderSchema = z.object({
  id: z.string(),
  uid: z.number().int().positive(),
  threadId: z.string().optional(),
  folder: z.string(),
  from: MailParticipantSchema,
  to: z.array(MailParticipantSchema),
  cc: z.array(MailParticipantSchema).optional(),
  subject: z.string(),
  date: z.string(),
  preview: z.string(),
  isRead: z.boolean(),
  isStarred: z.boolean(),
  isFlaggedUrgent: z.boolean().default(false),
  hasAttachments: z.boolean(),
  sizeBytes: z.number().int().nonnegative(),
  labels: z.array(z.string()).default([]),
});

export type MailHeader = z.infer<typeof MailHeaderSchema>;

export const MailDetailSchema = MailHeaderSchema.extend({
  bcc: z.array(MailParticipantSchema).optional(),
  replyTo: z.array(MailParticipantSchema).optional(),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  attachments: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number(),
      contentId: z.string().optional(),
      downloadUrl: z.string(),
    })
  ),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  headers: z.record(z.any()).optional(),
});

export type MailDetail = z.infer<typeof MailDetailSchema>;

export const ListMessagesQuerySchema = z.object({
  folder: z.string().default('INBOX'),
  cursor: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  starredOnly: z.coerce.boolean().optional(),
  hasAttachmentsOnly: z.coerce.boolean().optional(),
});

export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

export const ListMessagesResponseSchema = z.object({
  messages: z.array(MailHeaderSchema),
  folder: MailFolderSchema,
  totalMessages: z.number().int(),
  currentPage: z.number().int(),
  totalPages: z.number().int(),
  nextCursor: z.string().nullable().optional(),
});

export type ListMessagesResponse = z.infer<typeof ListMessagesResponseSchema>;

export const SendWebmailPayloadSchema = z.object({
  mailboxId: z.string().uuid(),
  to: z.array(MailParticipantSchema).min(1),
  cc: z.array(MailParticipantSchema).optional(),
  bcc: z.array(MailParticipantSchema).optional(),
  subject: z.string().min(1),
  htmlBody: z.string(),
  textBody: z.string().optional(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentBase64: z.string().optional(),
      mimeType: z.string(),
      driveFileId: z.string().optional(),
      shareLinkUrl: z.string().optional(),
    })
  ).optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  draftId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type SendWebmailPayload = z.infer<typeof SendWebmailPayloadSchema>;
