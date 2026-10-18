export const UserRole = {
  SUPERADMIN: 'superadmin',
  MAIL_ADMIN: 'mail_admin',
  MAIL_USER: 'mail_user',
  MAIL_AUDITOR: 'mail_auditor',
  APPLICATION_SERVICE: 'application_service',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const MailboxFolderType = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFTS: 'DRAFTS',
  TRASH: 'TRASH',
  SPAM: 'SPAM',
  ARCHIVE: 'ARCHIVE',
  STARRED: 'STARRED',
  CUSTOM: 'CUSTOM',
} as const;
export type MailboxFolderType = typeof MailboxFolderType[keyof typeof MailboxFolderType];

export const EmailPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;
export type EmailPriority = typeof EmailPriority[keyof typeof EmailPriority];

export const EmailDeliveryStatus = {
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
  FAILED: 'FAILED',
} as const;
export type EmailDeliveryStatus = typeof EmailDeliveryStatus[keyof typeof EmailDeliveryStatus];

export const DeliveryAttemptStatus = {
  SUCCESS: 'SUCCESS',
  TEMPORARY_FAILURE: 'TEMPORARY_FAILURE',
  PERMANENT_FAILURE: 'PERMANENT_FAILURE',
} as const;
export type DeliveryAttemptStatus = typeof DeliveryAttemptStatus[keyof typeof DeliveryAttemptStatus];

export const SuppressionReason = {
  BOUNCE: 'BOUNCE',
  COMPLAINT: 'COMPLAINT',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  MANUAL: 'MANUAL',
} as const;
export type SuppressionReason = typeof SuppressionReason[keyof typeof SuppressionReason];

export const AIActionType = {
  SUMMARIZE_EMAIL: 'SUMMARIZE_EMAIL',
  SUMMARIZE_THREAD: 'SUMMARIZE_THREAD',
  GENERATE_REPLY: 'GENERATE_REPLY',
  REWRITE_TONE: 'REWRITE_TONE',
  EXTRACT_ACTIONS: 'EXTRACT_ACTIONS',
  TRANSLATE: 'TRANSLATE',
} as const;
export type AIActionType = typeof AIActionType[keyof typeof AIActionType];

export const AppScope = {
  MAIL_SEND: 'mail:send',
  MAIL_BATCH_SEND: 'mail:batch_send',
  MAIL_READ_STATUS: 'mail:read_status',
  MAIL_TEMPLATES_READ: 'mail:templates:read',
  MAIL_TEMPLATES_WRITE: 'mail:templates:write',
  MAIL_WEBHOOKS_MANAGE: 'mail:webhooks:manage',
} as const;
export type AppScope = typeof AppScope[keyof typeof AppScope];
