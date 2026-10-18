import { MailDeliveryProvider, SendEmailOptions, SendEmailResult } from '../interfaces.js';

export interface ExternalApiConfig {
  endpointUrl: string;
  apiKey: string;
  providerName?: string;
}

export class ExternalApiMailProvider implements MailDeliveryProvider {
  public readonly name: string;

  constructor(private config: ExternalApiConfig) {
    this.name = config.providerName || 'external-api';
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.endpointUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const messageId = options.messageId || `<${Date.now()}@api.mail.oussamma.tn>`;
    try {
      const res = await fetch(this.config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          from: options.from,
          fromName: options.fromName,
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          text: options.text,
          html: options.html,
          headers: options.headers,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const isTransient = res.status >= 500 || res.status === 429;
        return {
          success: false,
          messageId,
          provider: this.name,
          error: `API error (${res.status}): ${errText}`,
          isTransientError: isTransient,
        };
      }

      const body = await res.json().catch(() => ({}));
      return {
        success: true,
        messageId: body.id || messageId,
        provider: this.name,
        response: '200 OK',
      };
    } catch (err: any) {
      return {
        success: false,
        messageId,
        provider: this.name,
        error: err.message,
        isTransientError: true,
      };
    }
  }
}
