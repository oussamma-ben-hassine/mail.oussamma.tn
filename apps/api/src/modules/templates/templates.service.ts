import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  PreviewTemplateRequest,
  TemplateResponse,
  PreviewTemplateResponse,
} from '@mail/contracts';
import { TemplateEngine } from '@mail/mail-core';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async listTemplates(): Promise<TemplateResponse[]> {
    const templates = await this.prisma.emailTemplate.findMany({
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map(t => {
      const v = t.versions[0] || {};
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        currentVersion: t.currentVersion,
        subject: v.subject || '',
        htmlContent: v.htmlContent || '',
        textContent: v.textContent,
        variablesSchema: v.variablesSchema as any,
        sampleData: v.sampleData as any,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });
  }

  async getTemplate(id: string): Promise<TemplateResponse> {
    const t = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!t) throw new NotFoundException(`Template introuvable : ${id}`);
    const v = t.versions[0] || {};

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      currentVersion: t.currentVersion,
      subject: v.subject || '',
      htmlContent: v.htmlContent || '',
      textContent: v.textContent,
      variablesSchema: v.variablesSchema as any,
      sampleData: v.sampleData as any,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  async createTemplate(ownerId: string, payload: CreateTemplateRequest): Promise<TemplateResponse> {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { name: payload.name },
    });
    if (existing) {
      throw new ConflictException(`Un template avec le nom '${payload.name}' existe déjà`);
    }

    const template = await this.prisma.emailTemplate.create({
      data: {
        name: payload.name,
        description: payload.description,
        ownerId,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            subject: payload.subject,
            htmlContent: payload.htmlContent,
            textContent: payload.textContent,
            variablesSchema: payload.variablesSchema,
            sampleData: payload.sampleData,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    const v = template.versions[0];
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      currentVersion: template.currentVersion,
      subject: v.subject,
      htmlContent: v.htmlContent,
      textContent: v.textContent,
      variablesSchema: v.variablesSchema as any,
      sampleData: v.sampleData as any,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async updateTemplate(id: string, payload: UpdateTemplateRequest): Promise<TemplateResponse> {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    if (!template) throw new NotFoundException(`Template introuvable : ${id}`);

    const latest = template.versions[0];
    const newVersionNumber = template.currentVersion + 1;

    const newSubject = payload.subject || latest.subject;
    const newHtml = payload.htmlContent || latest.htmlContent;
    const newText = payload.textContent !== undefined ? payload.textContent : latest.textContent;

    await this.prisma.$transaction([
      this.prisma.emailTemplateVersion.create({
        data: {
          templateId: id,
          version: newVersionNumber,
          subject: newSubject,
          htmlContent: newHtml,
          textContent: newText,
          variablesSchema: payload.variablesSchema || latest.variablesSchema,
          sampleData: payload.sampleData || latest.sampleData,
          changeLog: payload.changeLog || `Mise à jour v${newVersionNumber}`,
        },
      }),
      this.prisma.emailTemplate.update({
        where: { id },
        data: {
          currentVersion: newVersionNumber,
          description: payload.description !== undefined ? payload.description : template.description,
        },
      }),
    ]);

    return this.getTemplate(id);
  }

  async previewTemplate(id: string, payload: PreviewTemplateRequest): Promise<PreviewTemplateResponse> {
    const template = await this.getTemplate(id);
    const vars = payload.variables || template.sampleData || {};

    const subRes = TemplateEngine.render(template.subject, vars);
    const htmlRes = TemplateEngine.render(template.htmlContent, vars);
    const textRes = template.textContent ? TemplateEngine.render(template.textContent, vars) : { rendered: '', missingVariables: [] };

    const missing = Array.from(new Set([...subRes.missingVariables, ...htmlRes.missingVariables, ...textRes.missingVariables]));

    return {
      subject: subRes.rendered,
      html: htmlRes.rendered,
      text: textRes.rendered,
      missingVariables: missing,
    };
  }
}
