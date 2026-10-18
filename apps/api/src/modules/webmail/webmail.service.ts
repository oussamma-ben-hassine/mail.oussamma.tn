import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ImapAdapter, SmtpMailProvider, EmailSanitizer } from '@mail/mail-core';
import {
  ListMessagesQuery,
  ListMessagesResponse,
  MailDetail,
  SendWebmailPayload,
} from '@mail/contracts';
import { SupervisorAdapter } from '@mail/integrations';

@Injectable()
export class WebmailService {
  private imapAdapter: ImapAdapter;
  private smtpProvider: SmtpMailProvider;
  private supervisorAdapter: SupervisorAdapter;

  constructor(private prisma: PrismaService) {
    this.imapAdapter = new ImapAdapter({
      simulated: process.env.MAIL_DELIVERY_MODE === 'simulated' || process.env.NODE_ENV !== 'production',
    });

    this.smtpProvider = new SmtpMailProvider({
      host: process.env.MAIL_SMTP_HOST || 'localhost',
      port: Number(process.env.MAIL_SMTP_PORT) || 587,
      secure: process.env.MAIL_SMTP_SECURE === 'true',
      user: process.env.MAIL_SMTP_USER,
      password: process.env.MAIL_SMTP_PASSWORD,
      simulated: process.env.MAIL_DELIVERY_MODE === 'simulated' || process.env.NODE_ENV !== 'production',
    });

    this.supervisorAdapter = new SupervisorAdapter({
      baseUrl: process.env.SUPERVISOR_BASE_URL || 'https://supervisor.oussamma.tn',
      supervisorKey: process.env.SUPERVISOR_KEY || '',
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.SUPERVISOR_KEY,
    });
  }

  /**
   * Récupère la boîte aux lettres associée à l'utilisateur
   */
  async getUserMailbox(userId: string, mailboxId?: string) {
    let mailbox;
    if (mailboxId) {
      mailbox = await this.prisma.mailbox.findFirst({
        where: {
          id: mailboxId,
          members: { some: { userId } },
        },
        include: { domain: true },
      });
    } else {
      mailbox = await this.prisma.mailbox.findFirst({
        where: { members: { some: { userId } } },
        include: { domain: true },
      });
    }

    if (!mailbox) {
      // Auto-provisioning d'une boîte personnelle si l'utilisateur n'en a pas encore
      const user = await this.prisma.userIdentity.findUnique({ where: { id: userId } });
      const defaultDomain = await this.prisma.mailDomain.findFirst({ where: { isVerified: true } });

      if (user && defaultDomain) {
        mailbox = await this.prisma.mailbox.create({
          data: {
            domainId: defaultDomain.id,
            email: user.email,
            displayName: user.name,
            members: {
              create: {
                userId: user.id,
                role: 'owner',
              },
            },
          },
          include: { domain: true },
        });
      }
    }

    if (!mailbox) {
      throw new NotFoundException('Aucune boîte aux lettres accessible pour cet utilisateur');
    }

    return mailbox;
  }

  async listFolders(userId: string, mailboxId?: string) {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    return this.imapAdapter.listFolders({
      email: mailbox.email,
      host: process.env.MAIL_IMAP_HOST || 'localhost',
      port: Number(process.env.MAIL_IMAP_PORT) || 993,
      secure: process.env.MAIL_IMAP_SECURE !== 'false',
    });
  }

  async listMessages(userId: string, query: ListMessagesQuery, mailboxId?: string): Promise<ListMessagesResponse> {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    const creds = {
      email: mailbox.email,
      host: process.env.MAIL_IMAP_HOST || 'localhost',
      port: Number(process.env.MAIL_IMAP_PORT) || 993,
      secure: process.env.MAIL_IMAP_SECURE !== 'false',
    };

    const folderName = (query.folder || 'INBOX').toUpperCase();
    const { messages, total } = await this.imapAdapter.fetchMessages(
      creds,
      folderName,
      query.page || 1,
      query.limit || 30
    );

    const folders = await this.imapAdapter.listFolders(creds);
    const currentFolder = folders.find(f => f.name.toUpperCase() === folderName) || {
      id: folderName.toLowerCase(),
      name: folderName,
      path: folderName,
      type: 'INBOX' as any,
      unreadCount: 0,
      totalCount: total,
      delimiter: '/',
    };

    const totalPages = Math.ceil(total / (query.limit || 30)) || 1;

    return {
      messages,
      folder: currentFolder,
      totalMessages: total,
      currentPage: query.page || 1,
      totalPages,
      nextCursor: query.page < totalPages ? String(query.page + 1) : null,
    };
  }

  async getMessage(userId: string, folder: string, messageId: string, mailboxId?: string): Promise<MailDetail> {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    const creds = {
      email: mailbox.email,
      host: process.env.MAIL_IMAP_HOST || 'localhost',
      port: Number(process.env.MAIL_IMAP_PORT) || 993,
      secure: process.env.MAIL_IMAP_SECURE !== 'false',
    };

    const msg = await this.imapAdapter.getMessage(creds, folder, messageId);
    if (!msg) throw new NotFoundException(`Message introuvable : ${messageId}`);

    // Sanitisation sécurisée du HTML pour bloquer scripts et tracking pixels
    const { cleanHtml, blockedImageCount } = EmailSanitizer.sanitize(msg.htmlBody || '', {
      blockRemoteImages: true,
    });

    return {
      ...msg,
      htmlBody: cleanHtml,
      headers: {
        ...msg.headers,
        'x-blocked-tracking-pixels': blockedImageCount,
      },
    };
  }

  async sendWebmail(userId: string, payload: SendWebmailPayload): Promise<{ success: boolean; messageId: string }> {
    const mailbox = await this.getUserMailbox(userId, payload.mailboxId);

    const recipients = payload.to.map(p => p.email);
    const ccRecipients = payload.cc?.map(p => p.email) || [];
    const bccRecipients = payload.bcc?.map(p => p.email) || [];

    const sendRes = await this.smtpProvider.sendEmail({
      from: mailbox.email,
      fromName: mailbox.displayName,
      to: recipients,
      cc: ccRecipients,
      bcc: bccRecipients,
      subject: payload.subject,
      html: payload.htmlBody,
      text: payload.textBody,
    });

    if (!sendRes.success) {
      throw new Error(`Échec de transmission SMTP : ${sendRes.error}`);
    }

    // Copie locale dans le dossier Envoyés
    this.imapAdapter.storeSentMessage(
      { email: mailbox.email, host: '', port: 0, secure: false },
      {
        id: `sent-${Date.now()}`,
        uid: Date.now(),
        folder: 'SENT',
        from: { name: mailbox.displayName, email: mailbox.email },
        to: payload.to,
        cc: payload.cc,
        subject: payload.subject,
        date: new Date().toISOString(),
        preview: payload.textBody?.substring(0, 100) || '',
        isRead: true,
        isStarred: false,
        hasAttachments: Boolean(payload.attachments && payload.attachments.length > 0),
        sizeBytes: 2500,
        htmlBody: payload.htmlBody,
        textBody: payload.textBody,
        attachments: payload.attachments || [],
      }
    );

    // Télémétrie Superviseur
    await this.supervisorAdapter.trackEvent(
      'mail.message.sent',
      userId,
      mailbox.email,
      sendRes.messageId,
      'success',
      {
        channel: 'webmail',
        recipientsCount: recipients.length,
      }
    );

    return { success: true, messageId: sendRes.messageId };
  }

  async moveMessage(userId: string, folder: string, messageId: string, targetFolder: string, mailboxId?: string) {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    return this.imapAdapter.moveMessage(
      { email: mailbox.email, host: '', port: 0, secure: false },
      folder,
      messageId,
      targetFolder
    );
  }

  async setFlags(userId: string, folder: string, messageId: string, flags: { read?: boolean; starred?: boolean }, mailboxId?: string) {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    return this.imapAdapter.setFlags(
      { email: mailbox.email, host: '', port: 0, secure: false },
      folder,
      messageId,
      flags
    );
  }

  async deleteMessage(userId: string, folder: string, messageId: string, mailboxId?: string) {
    const mailbox = await this.getUserMailbox(userId, mailboxId);
    return this.imapAdapter.deleteMessage(
      { email: mailbox.email, host: '', port: 0, secure: false },
      folder,
      messageId
    );
  }
}
