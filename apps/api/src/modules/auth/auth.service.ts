import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SsoAdapter } from '@mail/integrations';
import { UserRole } from '@mail/contracts';

@Injectable()
export class AuthService {
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

  getAuthorizationUrl(state?: string): { url: string; verifier: string } {
    const verifier = this.ssoAdapter.generateCodeVerifier();
    const challenge = this.ssoAdapter.generateCodeChallenge(verifier);
    const url = this.ssoAdapter.buildAuthorizationUrl(state || 'auth_state', challenge);
    return { url, verifier };
  }

  async handleCallback(code: string, verifier: string) {
    const tokens = await this.ssoAdapter.exchangeCode(code, verifier);
    const profile = await this.ssoAdapter.getUserProfile(tokens.accessToken);

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

    return {
      user: {
        id: user.id,
        sub: user.sub,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens,
    };
  }
}
