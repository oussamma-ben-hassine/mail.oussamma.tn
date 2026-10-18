import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SendEmailRequest, BatchSendEmailRequest, EmailResponse, AppScope, EmailDeliveryStatus } from '@mail/contracts';
import { TemplateEngine } from '@mail/mail-core';
import { SupervisorAdapter } from '@mail/integrations';

@Injectable()
export class MailingApiService {
  private supervisorAdapter: SupervisorAdapter;

  constructor(private prisma: PrismaService) {
    this.supervisorAdapter = new SupervisorAdapter({
      baseUrl: process.env.SUPERVISOR_BASE_URL || 'https://supervisor.oussamma.tn',
      supervisorKey: process.env.SUPERVISOR_KEY || '',
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.SUPERVISOR_KEY,
    });
  }

  /**
   * Envoi d'un email transactionnel individuel
   */
  async sendEmail(
    application: any,
    payload: SendEmailRequest,
    idempotencyKey?: string
  ): Promise<EmailResponse> {
    // 1. Vérification des scopes de l'application
    if (application && !application.scopes.includes(AppScope.MAIL_SEND)) {
      throw new ForbiddenException(`L'application n'a pas le scope requis '${AppScope.MAIL_SEND}'`);
    }

    // 2. Vérification des domaines expéditeurs autorisés
    const senderDomain = payload.from.split('@')[1];
    if (application && !application.allowedSenderDomains.includes(senderDomain)) {
      throw new ForbiddenException(
        `Le domaine expéditeur '${senderDomain}' n'est pas autorisé pour cette application. Autorisés : [${application.allowedSenderDomains.join(', ')}]`
      );
    }

    // 3. Gestion de l'idempotence
    if (idempotencyKey) {
      const existingJob = await this.prisma.mailJob.findUnique({
        where: { idempotencyKey },
      });
      if (existingJob) {
        return this.mapJobToResponse(existingJob);
      }
    }

    // 4. Vérification des quotas journaliers de l'application
    if (application) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const sentTodayCount = await this.prisma.mailJob.count({
        where: {
          applicationId: application.id,
          createdAt: { gte: startOfDay },
        },
      });

      if (sentTodayCount >= application.dailyQuota) {
        throw new BadRequestException(
          `Quota journalier d'envoi dépassé (${application.dailyQuota} emails/jour). Contactez l'administrateur.`
        );
      }
    }

    // 5. Vérification de la liste de suppression (rebonds, plaintes, désabonnements)
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const suppressed = await this.prisma.mailSuppression.findMany({
      where: { email: { in: recipients } },
    });

    if (suppressed.length > 0) {
      const suppressedEmails = suppressed.map(s => s.email).join(', ');
      throw new BadRequestException(
        `Envoi bloqué : Les destinataires suivants figurent sur la liste de suppression : ${suppressedEmails}`
      );
    }

    // 6. Rendu du template si templateId est fourni
    let renderedSubject = payload.subject;
    let renderedHtml = payload.html;
    let renderedText = payload.text;

    if (payload.templateId) {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { id: payload.templateId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!template || template.versions.length === 0) {
        throw new NotFoundException(`Template d'email introuvable : ${payload.templateId}`);
      }

      const activeVersion = template.versions[0];
      const vars = payload.templateVariables || {};

      const subRes = TemplateEngine.render(activeVersion.subject, vars);
      const htmlRes = TemplateEngine.render(activeVersion.htmlContent, vars);
      const textRes = activeVersion.textContent ? TemplateEngine.render(activeVersion.textContent, vars) : { rendered: '' };

      renderedSubject = subRes.rendered;
      renderedHtml = htmlRes.rendered;
      renderedText = textRes.rendered || renderedText;
    }

    // 7. Création du travail dans la base de données
    const job = await this.prisma.mailJob.create({
      data: {
        applicationId: application ? application.id : null,
        from: payload.from,
        fromName: payload.fromName || (application ? application.defaultFromName : null),
        to: recipients,
        cc: payload.cc ? (Array.isArray(payload.cc) ? payload.cc : [payload.cc]) : [],
        bcc: payload.bcc ? (Array.isArray(payload.bcc) ? payload.bcc : [payload.bcc]) : [],
        replyTo: payload.replyTo,
        subject: renderedSubject,
        html: renderedHtml,
        text: renderedText,
        priority: payload.priority as any,
        status: EmailDeliveryStatus.QUEUED,
        queuedAt: new Date(),
        idempotencyKey,
        metadata: payload.metadata || {},
        headers: payload.headers || {},
      },
    });

    // 8. Télémétrie Superviseur
    await this.supervisorAdapter.trackEvent(
      'mail.message.sent',
      application ? application.id : 'system',
      payload.from,
      job.id,
      'success',
      {
        recipientsCount: recipients.length,
        priority: payload.priority,
        applicationId: application ? application.id : null,
      }
    );

    return this.mapJobToResponse(job);
  }

  /**
   * Envoi par lot d'emails (Batch)
   */
  async sendBatch(application: any, payload: BatchSendEmailRequest): Promise<EmailResponse[]> {
    if (application && !application.scopes.includes(AppScope.MAIL_BATCH_SEND)) {
      throw new ForbiddenException(`L'application n'a pas le scope requis '${AppScope.MAIL_BATCH_SEND}'`);
    }

    const responses: EmailResponse[] = [];
    for (const email of payload.emails) {
      const res = await this.sendEmail(application, email);
      responses.push(res);
    }
    return responses;
  }

  /**
   * Consultation du statut d'un email
   */
  async getEmailById(id: string, application?: any): Promise<EmailResponse> {
    const job = await this.prisma.mailJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Email introuvable : ${id}`);
    }

    if (application && job.applicationId !== application.id) {
      throw new ForbiddenException('Accès refusé : Ce message appartient à une autre application');
    }

    return this.mapJobToResponse(job);
  }

  /**
   * Historique des événements de livraison
   */
  async getEmailEvents(jobId?: string, recipient?: string) {
    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (recipient) where.recipient = recipient;

    return this.prisma.mailDeliveryEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  private mapJobToResponse(job: any): EmailResponse {
    return {
      id: job.id,
      status: job.status as any,
      from: job.from,
      to: job.to,
      subject: job.subject,
      priority: job.priority as any,
      createdAt: job.createdAt.toISOString(),
      queuedAt: job.queuedAt ? job.queuedAt.toISOString() : null,
      sentAt: job.sentAt ? job.sentAt.toISOString() : null,
      failedAt: job.failedAt ? job.failedAt.toISOString() : null,
      errorMessage: job.errorMessage,
      attemptsCount: job.attemptsCount,
      idempotencyKey: job.idempotencyKey,
    };
  }
}
