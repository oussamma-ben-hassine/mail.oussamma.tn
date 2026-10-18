import { PrismaClient } from '@prisma/client';
import { SmtpMailProvider } from '@mail/mail-core';
import { SupervisorAdapter, NotificationHubAdapter } from '@mail/integrations';
import crypto from 'node:crypto';

export class EmailDeliveryProcessor {
  private prisma: PrismaClient;
  private smtpProvider: SmtpMailProvider;
  private supervisorAdapter: SupervisorAdapter;
  private notifHubAdapter: NotificationHubAdapter;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

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

    this.notifHubAdapter = new NotificationHubAdapter({
      webhookUrl: process.env.NOTIFICATION_HUB_URL,
      secret: process.env.NOTIFICATION_WEBHOOK_SECRET,
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.NOTIFICATION_HUB_URL,
    });
  }

  async processJob(jobId: string): Promise<boolean> {
    const job = await this.prisma.mailJob.findUnique({
      where: { id: jobId },
      include: { application: true },
    });

    if (!job) {
      console.error(`[Worker] Job ${jobId} not found`);
      return false;
    }

    if (job.status === 'SENT' || job.status === 'DELIVERED') {
      return true;
    }

    const currentAttempt = job.attemptsCount + 1;
    const startedAt = new Date();

    await this.prisma.mailJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        attemptsCount: currentAttempt,
      },
    });

    const sendRes = await this.smtpProvider.sendEmail({
      messageId: `<${job.id}@mail.oussamma.tn>`,
      from: job.from,
      fromName: job.fromName || undefined,
      to: job.to,
      cc: job.cc,
      bcc: job.bcc,
      replyTo: job.replyTo || undefined,
      subject: job.subject,
      text: job.text || undefined,
      html: job.html || undefined,
      priority: job.priority as any,
    });

    const completedAt = new Date();

    // 1. Enregistrer la tentative de livraison
    await this.prisma.mailDeliveryAttempt.create({
      data: {
        jobId: job.id,
        attemptNumber: currentAttempt,
        provider: sendRes.provider,
        status: sendRes.success ? 'SUCCESS' : (sendRes.isTransientError ? 'TEMPORARY_FAILURE' : 'PERMANENT_FAILURE'),
        responseCode: sendRes.response ? '250' : '500',
        responseBody: sendRes.response || null,
        errorMessage: sendRes.error || null,
        startedAt,
        completedAt,
      },
    });

    if (sendRes.success) {
      // 2. Succès de livraison
      await this.prisma.mailJob.update({
        where: { id: jobId },
        data: {
          status: 'DELIVERED',
          sentAt: completedAt,
          errorMessage: null,
        },
      });

      for (const recipient of job.to) {
        await this.prisma.mailDeliveryEvent.create({
          data: {
            jobId: job.id,
            eventType: 'delivered',
            recipient,
            occurredAt: completedAt,
          },
        });
      }

      // Télémétrie Superviseur
      await this.supervisorAdapter.trackEvent(
        'mail.message.sent',
        job.applicationId || 'system',
        job.from,
        job.id,
        'success',
        {
          attemptsCount: currentAttempt,
          provider: sendRes.provider,
        }
      );

      // Notifier via Webhook sortant si configuré
      await this.dispatchOutgoingWebhook(job, 'email.delivered', {
        jobId: job.id,
        messageId: sendRes.messageId,
        recipients: job.to,
        deliveredAt: completedAt.toISOString(),
      });

      return true;
    } else {
      // 3. Échec de livraison
      const isDeadLetter = currentAttempt >= job.maxAttempts || !sendRes.isTransientError;
      const nextStatus = isDeadLetter ? 'FAILED' : 'QUEUED';

      await this.prisma.mailJob.update({
        where: { id: jobId },
        data: {
          status: nextStatus,
          failedAt: isDeadLetter ? completedAt : null,
          errorMessage: sendRes.error || 'Erreur inconnue de transmission',
        },
      });

      for (const recipient of job.to) {
        await this.prisma.mailDeliveryEvent.create({
          data: {
            jobId: job.id,
            eventType: isDeadLetter ? 'failed' : 'retry_scheduled',
            recipient,
            occurredAt: completedAt,
            metadata: { error: sendRes.error, attempt: currentAttempt },
          },
        });
      }

      if (isDeadLetter) {
        // Envoi au superviseur et au Notification Hub
        await this.supervisorAdapter.trackEvent(
          'mail.message.failed',
          job.applicationId || 'system',
          job.from,
          job.id,
          'failure',
          {
            error: sendRes.error,
            attemptsCount: currentAttempt,
          }
        );

        await this.notifHubAdapter.dispatchAlert({
          category: 'delivery_failure',
          title: `Échec d’envoi d’email (${job.from})`,
          message: `Le message '${job.subject}' n'a pas pu être délivré après ${currentAttempt} tentatives. Erreur: ${sendRes.error}`,
          targetTelegram: true,
        });

        await this.dispatchOutgoingWebhook(job, 'email.failed', {
          jobId: job.id,
          error: sendRes.error,
          attemptsCount: currentAttempt,
        });
      }

      return false;
    }
  }

  private async dispatchOutgoingWebhook(job: any, eventName: string, data: Record<string, any>) {
    if (!job.applicationId) return;

    const webhooks = await this.prisma.mailWebhookEndpoint.findMany({
      where: {
        applicationId: job.applicationId,
        isActive: true,
        events: { has: eventName },
      },
    });

    for (const wh of webhooks) {
      try {
        const bodyStr = JSON.stringify({
          id: crypto.randomUUID(),
          event: eventName,
          timestamp: new Date().toISOString(),
          data,
        });

        const signature = crypto.createHmac('sha256', wh.secret).update(bodyStr).digest('hex');

        await fetch(wh.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Signature-SHA256': signature,
            'User-Agent': 'Mail.oussamma.tn-Webhook/1.0',
          },
          body: bodyStr,
          signal: AbortSignal.timeout(5000),
        });
      } catch (err: any) {
        console.warn(`[Worker] Échec envoi webhook vers ${wh.targetUrl}: ${err.message}`);
      }
    }
  }
}
