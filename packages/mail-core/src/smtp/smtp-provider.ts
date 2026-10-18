import type { MailDeliveryProvider, SendEmailOptions, SendEmailResult } from '../interfaces.ts';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  simulated?: boolean;
}

export class SmtpMailProvider implements MailDeliveryProvider {
  public readonly name = 'smtp';
  private config: SmtpConfig;
  private transporter: any = null;
  private simulatedSentLog: Array<{ options: SendEmailOptions; sentAt: Date; messageId: string }> = [];

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  private async getTransporter(): Promise<any> {
    if (this.config.simulated) return null;
    if (!this.transporter) {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.user && this.config.password ? {
          user: this.config.user,
          pass: this.config.password,
        } : undefined,
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });
    }
    return this.transporter;
  }

  async verifyConnection(): Promise<boolean> {
    if (this.config.simulated) {
      return true;
    }
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const messageId = options.messageId || `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@mail.oussamma.tn>`;

    // Safe simulated mode: Prevents sending real emails to outside world in dev or test
    if (this.config.simulated || !this.transporter) {
      this.simulatedSentLog.push({ options, sentAt: new Date(), messageId });
      return {
        success: true,
        messageId,
        provider: 'simulated-smtp',
        response: '250 2.0.0 OK (Simulated delivery)',
      };
    }

    try {
      const mailOptions: nodemailer.SendMailOptions = {
        messageId,
        from: options.fromName ? `"${options.fromName}" <${options.from}>` : options.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        headers: options.headers,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);
      const rejected = (info.rejected || []).map(r => typeof r === 'string' ? r : r.address);

      return {
        success: rejected.length === 0,
        messageId: info.messageId || messageId,
        provider: 'smtp',
        response: info.response,
        rejectedRecipients: rejected,
      };
    } catch (err: any) {
      const isTransient = this.isTransientSmtpError(err);
      return {
        success: false,
        messageId,
        provider: 'smtp',
        error: err.message || 'SMTP transmission failure',
        isTransientError: isTransient,
      };
    }
  }

  public getSimulatedLog() {
    return [...this.simulatedSentLog];
  }

  public clearSimulatedLog() {
    this.simulatedSentLog = [];
  }

  private isTransientSmtpError(err: any): boolean {
    const code = err.responseCode || err.code;
    // 4xx SMTP codes indicate temporary failure; 5xx indicate permanent failure
    if (typeof code === 'number' && code >= 400 && code < 500) {
      return true;
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
      return true;
    }
    return false;
  }
}
