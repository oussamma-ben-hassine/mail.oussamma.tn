import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SsoAdapter } from '@mail/integrations';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserRole } from '@mail/contracts';

@Injectable()
export class SsoAuthGuard implements CanActivate {
  private ssoAdapter: SsoAdapter;

  constructor(private prisma: PrismaService) {
    this.ssoAdapter = new SsoAdapter({
      issuer: process.env.SSO_ISSUER || 'https://sso-a.oussamma.tn',
      clientId: process.env.SSO_CLIENT_ID || 'mail_oussamma_tn',
      clientSecret: process.env.SSO_CLIENT_SECRET || '',
      redirectUri: process.env.SSO_REDIRECT_URI || 'https://mail.oussamma.tn/auth/callback',
      jwksUri: process.env.SSO_JWKS_URI || 'https://sso-a.oussamma.tn/oauth/jwks',
      mockMode: process.env.NODE_ENV !== 'production' && !process.env.SSO_CLIENT_SECRET,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Jeton d’authentification Bearer manquant');
    }

    const token = authHeader.substring(7).trim();

    try {
      const profile = await this.ssoAdapter.getUserProfile(token);
      if (!profile || !profile.sub) {
        throw new UnauthorizedException('Jeton SSO invalide ou expiré');
      }

      // Sync or retrieve user in local DB
      let user = await this.prisma.userIdentity.findUnique({
        where: { sub: profile.sub },
      });

      if (!user) {
        user = await this.prisma.userIdentity.create({
          data: {
            sub: profile.sub,
            email: profile.email,
            name: profile.name,
            preferredName: profile.preferredUsername,
            role: profile.role as any,
          },
        });
      }

      request.user = {
        id: user.id,
        sub: user.sub,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        token,
      };

      return true;
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Authentification SSO échouée');
    }
  }
}
