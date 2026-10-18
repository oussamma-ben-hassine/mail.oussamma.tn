import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '@mail/contracts';

@ApiTags('Administration & Supervision')
@ApiBearerAuth()
@Controller('api/v1/admin')
@UseGuards(SsoAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Indicateurs clés du tableau de bord administratif' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('domains')
  @ApiOperation({ summary: 'Lister les domaines gérés' })
  async listDomains() {
    return this.adminService.listDomains();
  }

  @Post('domains')
  @ApiOperation({ summary: 'Ajouter un nouveau domaine' })
  async createDomain(@Body('name') name: string) {
    return this.adminService.createDomain(name);
  }

  @Get('domains/:id/dns-check')
  @ApiOperation({ summary: 'Vérifier les enregistrements DNS réels (MX, SPF, DKIM, DMARC)' })
  async checkDomainDns(@Param('id') id: string) {
    return this.adminService.checkDomainDns(id);
  }

  @Get('mailboxes')
  @ApiOperation({ summary: 'Lister les boîtes aux lettres, leurs quotas et alias' })
  async listMailboxes() {
    return this.adminService.listMailboxes();
  }

  @Post('mailboxes')
  @ApiOperation({ summary: 'Créer une nouvelle boîte aux lettres' })
  async createMailbox(
    @Body() body: { domainId: string; emailPrefix: string; displayName: string; userSub?: string }
  ) {
    return this.adminService.createMailbox(body.domainId, body.emailPrefix, body.displayName, body.userSub);
  }

  @Get('audit')
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN, UserRole.MAIL_AUDITOR)
  @ApiOperation({ summary: 'Consulter les journaux d’audit de sécurité' })
  async listAuditLogs() {
    return this.adminService.listAuditLogs();
  }
}
