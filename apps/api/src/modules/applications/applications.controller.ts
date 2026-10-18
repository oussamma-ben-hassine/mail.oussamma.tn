import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreateApplicationRequest,
  CreateCredentialRequest,
  ApplicationResponse,
  CredentialResponse,
  ApplicationUsageResponse,
  UserRole,
} from '@mail/contracts';

@ApiTags('Applications M2M & Clés API')
@ApiBearerAuth()
@Controller('api/v1/applications')
@UseGuards(SsoAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly appsService: ApplicationsService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
  @ApiOperation({ summary: 'Lister toutes les applications enregistrées' })
  @ApiResponse({ status: 200, description: 'Liste des applications retournée' })
  async listApplications(): Promise<ApplicationResponse[]> {
    return this.appsService.listApplications();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter les détails d’une application' })
  async getApplication(@Param('id') id: string): Promise<ApplicationResponse> {
    return this.appsService.getApplication(id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
  @ApiOperation({ summary: 'Enregistrer une nouvelle application de l’écosystème' })
  @ApiResponse({ status: 201, description: 'Application créée avec succès' })
  async createApplication(
    @Req() req: any,
    @Body() payload: CreateApplicationRequest
  ): Promise<ApplicationResponse> {
    return this.appsService.createApplication(req.user.id, payload);
  }

  @Post(':id/credentials')
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
  @ApiOperation({ summary: 'Générer une nouvelle clé d’API pour l’application (affichée une seule fois)' })
  @ApiResponse({ status: 201, description: 'Clé API générée avec succès' })
  async createCredential(
    @Param('id') id: string,
    @Body() payload: CreateCredentialRequest
  ): Promise<CredentialResponse> {
    return this.appsService.createCredential(id, payload);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Consulter la consommation et le quota restant de l’application' })
  @ApiResponse({ status: 200, description: 'Métriques d’utilisation retournées' })
  async getUsage(@Param('id') id: string): Promise<ApplicationUsageResponse> {
    return this.appsService.getUsage(id);
  }
}
