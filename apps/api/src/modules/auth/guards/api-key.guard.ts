import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CryptoSecurity } from '@mail/mail-core';
import { UserRole } from '@mail/contracts';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || this.extractBearerKey(request.headers['authorization']);

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('mk_')) {
      throw new UnauthorizedException('Clé API machine-to-machine invalide ou manquante (entête X-API-Key)');
    }

    const keyHash = CryptoSecurity.hashApiKey(apiKey);

    const credential = await this.prisma.apiCredential.findUnique({
      where: { keyHash },
      include: { application: true },
    });

    if (!credential || credential.isRevoked) {
      throw new UnauthorizedException('Clé API révoquée ou introuvable');
    }

    if (credential.expiresAt && new Date() > credential.expiresAt) {
      throw new UnauthorizedException('Clé API expirée');
    }

    if (!credential.application.isActive) {
      throw new UnauthorizedException('Application désactivée');
    }

    // Update last used timestamp
    await this.prisma.apiCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    request.application = credential.application;
    request.user = {
      id: credential.application.id,
      name: credential.application.name,
      role: UserRole.APPLICATION_SERVICE,
      scopes: credential.application.scopes,
      allowedDomains: credential.application.allowedSenderDomains,
    };

    return true;
  }

  private extractBearerKey(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer mk_')) return null;
    return authHeader.substring(7).trim();
  }
}
