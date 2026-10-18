import crypto from 'node:crypto';

export interface NotificationHubConfig {
  webhookUrl?: string;
  secret?: string;
  mockMode?: boolean;
}

export interface NotificationPayload {
  category: 'email_urgent' | 'quota_warning' | 'infrastructure_alert' | 'delivery_failure';
  title: string;
  message: string;
  userId?: string;
  targetTelegram?: boolean;
  metadata?: Record<string, any>;
}

export class NotificationHubAdapter {
  private webhookUrl: string;
  private secret: string;
  private mockMode: boolean;
  private sentNotifications: NotificationPayload[] = [];
  private deduplicationCache: Map<string, number> = new Map();

  constructor(config: NotificationHubConfig) {
    this.webhookUrl = config.webhookUrl || '';
    this.secret = config.secret || '';
    this.mockMode = Boolean(config.mockMode || !config.webhookUrl);
  }

  /**
   * Dispatch a notification avoiding loops and duplicates
   */
  public async dispatchAlert(payload: NotificationPayload): Promise<boolean> {
    // 1. Anti-loop protection: Déduplication sur 5 minutes pour la même alerte
    const dedupKey = `${payload.category}:${payload.userId || 'system'}:${payload.title}`;
    const now = Date.now();
    const lastSent = this.deduplicationCache.get(dedupKey);

    if (lastSent && now - lastSent < 300000) {
      // Alerte déjà transmise il y a moins de 5 minutes, ignorer pour éviter les boucles
      return true;
    }
    this.deduplicationCache.set(dedupKey, now);

    if (this.mockMode) {
      this.sentNotifications.push(payload);
      return true;
    }

    try {
      const body = JSON.stringify({
        id: crypto.randomUUID(),
        source: 'mail.oussamma.tn',
        timestamp: new Date().toISOString(),
        ...payload,
      });

      const signature = this.secret
        ? crypto.createHmac('sha256', this.secret).update(body).digest('hex')
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (signature) {
        headers['X-Signature-SHA256'] = signature;
      }

      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body,
      });

      return res.ok;
    } catch {
      return false;
    }
  }

  public getSentMockNotifications(): NotificationPayload[] {
    return [...this.sentNotifications];
  }
}
