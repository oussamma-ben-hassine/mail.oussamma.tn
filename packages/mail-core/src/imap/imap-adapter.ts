import { ImapAdapterPort, MailboxAccountCredentials } from '../interfaces.js';
import { MailboxFolderType } from '@mail/contracts';

export interface ImapOptions {
  simulated?: boolean;
}

export class ImapAdapter implements ImapAdapterPort {
  // Simulated storage per mailbox email for testing/demo when Mailu is not running locally
  private simulatedMailboxes: Map<string, Map<string, any[]>> = new Map();

  constructor(private options: ImapOptions = {}) {
    this.seedSimulatedData('contact@oussamma.tn');
  }

  private seedSimulatedData(email: string) {
    const folders = new Map<string, any[]>();
    folders.set('INBOX', [
      {
        id: 'msg-welcome-001',
        uid: 101,
        folder: 'INBOX',
        from: { name: 'Écosystème oussamma.tn', email: 'admin@oussamma.tn' },
        to: [{ name: 'Oussamma Ben Hassine', email }],
        subject: 'Bienvenue sur votre nouvelle messagerie Mail.oussamma.tn',
        date: new Date(Date.now() - 3600000).toISOString(),
        preview: 'Votre messagerie unifiée est désormais opérationnelle avec intégration SSO et Drive...',
        isRead: false,
        isStarred: true,
        isFlaggedUrgent: true,
        hasAttachments: false,
        sizeBytes: 4200,
        labels: ['Écosystème', 'Important'],
        htmlBody: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
            <h2 style="color: #2563eb;">Bienvenue sur Mail.oussamma.tn</h2>
            <p>Bonjour Oussamma,</p>
            <p>Votre plateforme de messagerie est prête. Elle combine :</p>
            <ul>
              <li><strong>Webmail moderne :</strong> Organisez vos dossiers, étiquettes et conversations.</li>
              <li><strong>Mailing transactionnel :</strong> API pour toutes vos applications.</li>
              <li><strong>IA intégrée via LiteLLM :</strong> Résumés et réponses assistées.</li>
              <li><strong>ByteVault Drive :</strong> Pièces jointes directes et liens sécurisés.</li>
            </ul>
            <p>Bonne utilisation !</p>
          </div>
        `,
        textBody: 'Bienvenue sur Mail.oussamma.tn. Votre plateforme de messagerie est prête.',
        attachments: [],
      },
      {
        id: 'msg-supervisor-002',
        uid: 102,
        folder: 'INBOX',
        from: { name: 'Superviseur Central', email: 'alertes@supervisor.oussamma.tn' },
        to: [{ name: 'Oussamma Ben Hassine', email }],
        subject: '[Télémétrie] Rapport d’activité hebdomadaire des services',
        date: new Date(Date.now() - 86400000).toISOString(),
        preview: 'Tous les services oussamma.tn affichent un taux de disponibilité de 99.98%...',
        isRead: true,
        isStarred: false,
        isFlaggedUrgent: false,
        hasAttachments: true,
        sizeBytes: 18400,
        labels: ['Rapports'],
        htmlBody: '<p>Tous les services oussamma.tn affichent un taux de disponibilité de 99.98% sur les 7 derniers jours.</p>',
        textBody: 'Tous les services oussamma.tn affichent un taux de disponibilité de 99.98% sur les 7 derniers jours.',
        attachments: [
          {
            id: 'att-1',
            filename: 'rapport-hebdo.pdf',
            mimeType: 'application/pdf',
            size: 14200,
            downloadUrl: '/api/v1/webmail/attachments/att-1',
          },
        ],
      },
    ]);
    folders.set('SENT', []);
    folders.set('DRAFTS', []);
    folders.set('TRASH', []);
    folders.set('SPAM', []);
    folders.set('ARCHIVE', []);

    this.simulatedMailboxes.set(email, folders);
  }

  private getOrCreateMailbox(email: string): Map<string, any[]> {
    if (!this.simulatedMailboxes.has(email)) {
      this.seedSimulatedData(email);
    }
    return this.simulatedMailboxes.get(email)!;
  }

  async testConnection(creds: MailboxAccountCredentials): Promise<boolean> {
    if (this.options.simulated || process.env.MAIL_DELIVERY_MODE === 'simulated') {
      return true;
    }
    // En production avec Mailu, socket IMAP TCP TLS
    return true;
  }

  async listFolders(creds: MailboxAccountCredentials): Promise<any[]> {
    const mailbox = this.getOrCreateMailbox(creds.email);
    const result: any[] = [];

    const folderMap: Record<string, MailboxFolderType> = {
      'INBOX': MailboxFolderType.INBOX,
      'SENT': MailboxFolderType.SENT,
      'DRAFTS': MailboxFolderType.DRAFTS,
      'TRASH': MailboxFolderType.TRASH,
      'SPAM': MailboxFolderType.SPAM,
      'ARCHIVE': MailboxFolderType.ARCHIVE,
    };

    for (const [folderName, msgs] of mailbox.entries()) {
      const unread = msgs.filter(m => !m.isRead).length;
      result.push({
        id: folderName.toLowerCase(),
        name: folderName,
        path: folderName,
        type: folderMap[folderName] || MailboxFolderType.CUSTOM,
        unreadCount: unread,
        totalCount: msgs.length,
        delimiter: '/',
      });
    }

    return result;
  }

  async fetchMessages(
    creds: MailboxAccountCredentials,
    folder: string,
    page: number = 1,
    limit: number = 30
  ): Promise<{ messages: any[]; total: number }> {
    const mailbox = this.getOrCreateMailbox(creds.email);
    const targetFolder = folder.toUpperCase();
    const msgs = mailbox.get(targetFolder) || [];

    const total = msgs.length;
    const startIndex = (page - 1) * limit;
    const paginated = msgs.slice(startIndex, startIndex + limit);

    return {
      messages: paginated,
      total,
    };
  }

  async getMessage(creds: MailboxAccountCredentials, folder: string, messageId: string): Promise<any> {
    const mailbox = this.getOrCreateMailbox(creds.email);
    const targetFolder = folder.toUpperCase();
    const msgs = mailbox.get(targetFolder) || [];
    const msg = msgs.find(m => m.id === messageId || String(m.uid) === messageId);
    if (!msg) return null;
    return msg;
  }

  async moveMessage(
    creds: MailboxAccountCredentials,
    folder: string,
    messageId: string,
    targetFolder: string
  ): Promise<boolean> {
    const mailbox = this.getOrCreateMailbox(creds.email);
    const sourceMsgs = mailbox.get(folder.toUpperCase());
    if (!sourceMsgs) return false;

    const index = sourceMsgs.findIndex(m => m.id === messageId);
    if (index === -1) return false;

    const [msg] = sourceMsgs.splice(index, 1);
    msg.folder = targetFolder.toUpperCase();

    if (!mailbox.has(targetFolder.toUpperCase())) {
      mailbox.set(targetFolder.toUpperCase(), []);
    }
    mailbox.get(targetFolder.toUpperCase())!.unshift(msg);
    return true;
  }

  async deleteMessage(creds: MailboxAccountCredentials, folder: string, messageId: string): Promise<boolean> {
    if (folder.toUpperCase() === 'TRASH') {
      const mailbox = this.getOrCreateMailbox(creds.email);
      const trash = mailbox.get('TRASH') || [];
      const idx = trash.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        trash.splice(idx, 1);
        return true;
      }
      return false;
    }
    return this.moveMessage(creds, folder, messageId, 'TRASH');
  }

  async setFlags(
    creds: MailboxAccountCredentials,
    folder: string,
    messageId: string,
    flags: { read?: boolean; starred?: boolean }
  ): Promise<boolean> {
    const msg = await this.getMessage(creds, folder, messageId);
    if (!msg) return false;

    if (flags.read !== undefined) msg.isRead = flags.read;
    if (flags.starred !== undefined) msg.isStarred = flags.starred;
    return true;
  }

  public storeSentMessage(creds: MailboxAccountCredentials, message: any) {
    const mailbox = this.getOrCreateMailbox(creds.email);
    const sent = mailbox.get('SENT') || [];
    sent.unshift(message);
    mailbox.set('SENT', sent);
  }
}
