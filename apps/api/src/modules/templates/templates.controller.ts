import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TemplatesService } from './templates.service.js';
import { SsoAuthGuard } from '../auth/guards/sso-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  PreviewTemplateRequest,
  TemplateResponse,
  PreviewTemplateResponse,
  UserRole,
} from '@mail/contracts';

@ApiTags('Templates d’emails')
@ApiBearerAuth()
@Controller('api/v1/templates')
@UseGuards(SsoAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les modèles d’emails' })
  @ApiResponse({ status: 200, description: 'Liste des modèles retournée' })
  async listTemplates(): Promise<TemplateResponse[]> {
    return this.templatesService.listTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulter un modèle d’email par son identifiant' })
  @ApiResponse({ status: 200, description: 'Modèle retourné' })
  @ApiResponse({ status: 404, description: 'Modèle introuvable' })
  async getTemplate(@Param('id') id: string): Promise<TemplateResponse> {
    return this.templatesService.getTemplate(id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau modèle d’email (Admin)' })
  @ApiResponse({ status: 201, description: 'Modèle créé avec succès' })
  async createTemplate(
    @Req() req: any,
    @Body() payload: CreateTemplateRequest
  ): Promise<TemplateResponse> {
    return this.templatesService.createTemplate(req.user.id, payload);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.MAIL_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un modèle d’email (crée une nouvelle version)' })
  @ApiResponse({ status: 200, description: 'Modèle mis à jour avec nouvelle version' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() payload: UpdateTemplateRequest
  ): Promise<TemplateResponse> {
    return this.templatesService.updateTemplate(id, payload);
  }

  @Post(':id/preview')
  @ApiOperation({ summary: 'Prévisualiser un modèle avec variables d’échantillon' })
  @ApiResponse({ status: 200, description: 'Rendu HTML/Text généré avec succès' })
  async previewTemplate(
    @Param('id') id: string,
    @Body() payload: PreviewTemplateRequest
  ): Promise<PreviewTemplateResponse> {
    return this.templatesService.previewTemplate(id, payload);
  }
}
