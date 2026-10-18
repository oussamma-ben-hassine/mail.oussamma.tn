import type { Attachment, EmailPriority } from '@mail/contracts';

export interface SendEmailOptions {
  messageId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
  priority?: EmailPriority;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  provider: string;
  response?: string;
  rejectedRecipients?: string[];
  error?: string;
  isTransientError?: boolean;
}

export interface MailDeliveryProvider {
  readonly name: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  verifyConnection(): Promise<boolean>;
}

export interface MailboxAccountCredentials {
  email: string;
  password?: string;
  host: string;
  port: number;
  secure: boolean;
}

export interface ImapAdapterPort {
  testConnection(creds: MailboxAccountCredentials): Promise<boolean>;
  listFolders(creds: MailboxAccountCredentials): Promise<any[]>;
  fetchMessages(creds: MailboxAccountCredentials, folder: string, page: number, limit: number): Promise<any>;
  getMessage(creds: MailboxAccountCredentials, folder: string, messageId: string): Promise<any>;
  moveMessage(creds: MailboxAccountCredentials, folder: string, messageId: string, targetFolder: string): Promise<boolean>;
  deleteMessage(creds: MailboxAccountCredentials, folder: string, messageId: string): Promise<boolean>;
  setFlags(creds: MailboxAccountCredentials, folder: string, messageId: string, flags: { read?: boolean; starred?: boolean }): Promise<boolean>;
}
