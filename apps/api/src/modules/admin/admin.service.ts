import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import dns from 'node:dns/promises';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const totalMailboxes = await this.prisma.mailbox.count();
    const totalDomains = await this.prisma.mailDomain.count();
    const totalApplications = await this.prisma.mailApplication.count();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const sentToday = await this.prisma.mailJob.count({
      where: { createdAt: { gte: startOfDay } },
    });

    const failedToday = await this.prisma.mailJob.count({
      where: {
        createdAt: { gte: startOfDay },
        status: 'FAILED',
      },
    });

    const recentJobs = await this.prisma.mailJob.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        from: true,
        to: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        attemptsCount: true,
      },
    });

    return {
      totalMailboxes,
      totalDomains,
      totalApplications,
      sentToday,
      failedToday,
      deliverySuccessRate: sentToday > 0 ? Math.round(((sentToday - failedToday) / sentToday) * 1000) / 10 : 100,
      recentJobs,
    };
  }

  async listDomains() {
    return this.prisma.mailDomain.findMany({
      include: {
        _count: {
          select: { mailboxes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDomain(name: string) {
    return this.prisma.mailDomain.create({
      data: {
        name: name.toLowerCase().trim(),
        dkimSelector: 'mail',
      },
    });
  }

  async checkDomainDns(domainId: string) {
    const domain = await this.prisma.mailDomain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException(`Domaine introuvable : ${domainId}`);

    let spfFound = false;
    let dkimFound = false;
    let dmarcFound = false;
    let mxFound = false;

    try {
      // 1. Check MX records
      const mxRecords = await dns.resolveMx(domain.name).catch(() => []);
      mxFound = mxRecords.length > 0;

      // 2. Check SPF in TXT records
      const txtRecords = await dns.resolveTxt(domain.name).catch(() => []);
      for (const group of txtRecords) {
        const txt = group.join('');
        if (txt.includes('v=spf1')) {
          spfFound = true;
          break;
        }
      }

      // 3. Check DMARC at _dmarc.<domain>
      const dmarcTxt = await dns.resolveTxt(`_dmarc.${domain.name}`).catch(() => []);
      for (const group of dmarcTxt) {
        const txt = group.join('');
        if (txt.includes('v=DMARC1')) {
          dmarcFound = true;
          break;
        }
      }

      // 4. Check DKIM at <selector>._domainkey.<domain>
      const dkimTxt = await dns.resolveTxt(`${domain.dkimSelector}._domainkey.${domain.name}`).catch(() => []);
      dkimFound = dkimTxt.length > 0;
    } catch {
      // DNS network lookup errors
    }

    // Mettre à jour l'état dans la base de données
    const updated = await this.prisma.mailDomain.update({
      where: { id: domainId },
      data: {
        spfVerified: spfFound,
        dkimVerified: dkimFound,
        dmarcVerified: dmarcFound,
        isVerified: mxFound && spfFound,
      },
    });

    return {
      domain: updated.name,
      mxVerified: mxFound,
      spfVerified: spfFound,
      dkimVerified: dkimFound,
      dmarcVerified: dmarcFound,
      expectedRecords: {
        mx: `10 mail.${domain.name}`,
        spf: `v=spf1 mx a:mail.${domain.name} -all`,
        dmarc: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.name}`,
        dkim: `${domain.dkimSelector}._domainkey.${domain.name}`,
      },
    };
  }

  async listMailboxes() {
    const mailboxes = await this.prisma.mailbox.findMany({
      include: {
        domain: true,
        members: {
          include: { user: true },
        },
        aliases: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return mailboxes.map(m => ({
      id: m.id,
      email: m.email,
      displayName: m.displayName,
      domain: m.domain.name,
      quotaMb: Number(m.quotaBytes / BigInt(1048576)),
      usedMb: Number(m.usedBytes / BigInt(1048576)),
      isSuspended: m.isSuspended,
      members: m.members.map(mb => ({
        userId: mb.userId,
        name: mb.user.name,
        email: mb.user.email,
        role: mb.role,
      })),
      aliases: m.aliases.map(a => a.aliasEmail),
      createdAt: m.createdAt,
    }));
  }

  async createMailbox(domainId: string, emailPrefix: string, displayName: string, userSub?: string) {
    const domain = await this.prisma.mailDomain.findUnique({ where: { id: domainId } });
    if (!domain) throw new NotFoundException(`Domaine introuvable : ${domainId}`);

    const email = `${emailPrefix.toLowerCase().trim()}@${domain.name}`;

    return this.prisma.mailbox.create({
      data: {
        domainId,
        email,
        displayName,
      },
    });
  }

  async listAuditLogs(limit = 100) {
    return this.prisma.mailAuditLog.findMany({
      take: limit,
      orderBy: { occurredAt: 'desc' },
      include: { actor: true },
    });
  }
}
