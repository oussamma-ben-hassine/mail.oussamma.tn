import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateApplicationRequest,
  CreateCredentialRequest,
  ApplicationResponse,
  CredentialResponse,
  ApplicationUsageResponse,
} from '@mail/contracts';
import { CryptoSecurity } from '@mail/mail-core';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async listApplications(): Promise<ApplicationResponse[]> {
    const apps = await this.prisma.mailApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return apps.map(this.mapAppToResponse);
  }

  async getApplication(id: string): Promise<ApplicationResponse> {
    const app = await this.prisma.mailApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException(`Application introuvable : ${id}`);
    return this.mapAppToResponse(app);
  }

  async createApplication(ownerId: string, payload: CreateApplicationRequest): Promise<ApplicationResponse> {
    const app = await this.prisma.mailApplication.create({
      data: {
        ownerId,
        name: payload.name,
        description: payload.description,
        allowedSenderDomains: payload.allowedSenderDomains,
        defaultFromEmail: payload.defaultFromEmail,
        defaultFromName: payload.defaultFromName,
        dailyQuota: payload.dailyQuota,
        rateLimitPerMinute: payload.rateLimitPerMinute,
        scopes: payload.scopes as any,
      },
    });
    return this.mapAppToResponse(app);
  }

  async createCredential(appId: string, payload: CreateCredentialRequest): Promise<CredentialResponse> {
    const app = await this.prisma.mailApplication.findUnique({ where: { id: appId } });
    if (!app) throw new NotFoundException(`Application introuvable : ${appId}`);

    const { rawKey, keyPrefix, keyHash } = CryptoSecurity.generateApiKey('live');

    let expiresAt: Date | null = null;
    if (payload.expiresInDays && payload.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + payload.expiresInDays);
    }

    const cred = await this.prisma.apiCredential.create({
      data: {
        applicationId: appId,
        label: payload.label || 'API Key',
        keyPrefix,
        keyHash,
        expiresAt,
      },
    });

    return {
      id: cred.id,
      applicationId: cred.applicationId,
      label: cred.label,
      keyPrefix: cred.keyPrefix,
      apiKey: rawKey, // Renvoyé UNIQUEMENT à la création
      expiresAt: cred.expiresAt ? cred.expiresAt.toISOString() : null,
      lastUsedAt: cred.lastUsedAt ? cred.lastUsedAt.toISOString() : null,
      isRevoked: cred.isRevoked,
      createdAt: cred.createdAt.toISOString(),
    };
  }

  async getUsage(appId: string): Promise<ApplicationUsageResponse> {
    const app = await this.prisma.mailApplication.findUnique({ where: { id: appId } });
    if (!app) throw new NotFoundException(`Application introuvable : ${appId}`);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const sentToday = await this.prisma.mailJob.count({
      where: {
        applicationId: appId,
        createdAt: { gte: startOfDay },
      },
    });

    const sentThisMonth = await this.prisma.mailJob.count({
      where: {
        applicationId: appId,
        createdAt: { gte: startOfMonth },
      },
    });

    const failedCount = await this.prisma.mailJob.count({
      where: {
        applicationId: appId,
        status: 'FAILED',
        createdAt: { gte: startOfMonth },
      },
    });

    const bouncesCount = await this.prisma.mailJob.count({
      where: {
        applicationId: appId,
        status: 'BOUNCED',
        createdAt: { gte: startOfMonth },
      },
    });

    const totalJobs = sentThisMonth;
    const successfulJobs = totalJobs - (failedCount + bouncesCount);
    const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

    return {
      applicationId: appId,
      period: 'today',
      sentToday,
      dailyQuota: app.dailyQuota,
      remainingQuota: Math.max(0, app.dailyQuota - sentToday),
      sentThisMonth,
      bouncesCount,
      failedCount,
      successRate: Math.round(successRate * 10) / 10,
    };
  }

  private mapAppToResponse(app: any): ApplicationResponse {
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      allowedSenderDomains: app.allowedSenderDomains,
      defaultFromEmail: app.defaultFromEmail,
      defaultFromName: app.defaultFromName,
      dailyQuota: app.dailyQuota,
      rateLimitPerMinute: app.rateLimitPerMinute,
      scopes: app.scopes,
      isActive: app.isActive,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  }
}
