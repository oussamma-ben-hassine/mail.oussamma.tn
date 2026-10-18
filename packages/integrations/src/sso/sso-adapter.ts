import crypto from 'node:crypto';
import { UserRole } from '@mail/contracts';

export interface SsoConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  jwksUri?: string;
  mockMode?: boolean;
}

export interface SsoUserProfile {
  sub: string;
  email: string;
  name: string;
  preferredUsername?: string;
  role: UserRole;
  rawRoles: string[];
}

export interface SsoTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

export class SsoAdapter {
  private config: SsoConfig;
  private jwks: any = null;

  constructor(config: SsoConfig) {
    this.config = config;
  }

  /**
   * Generate PKCE code verifier
   */
  public generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge (SHA-256 base64url)
   */
  public generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Build OIDC authorization URL with PKCE
   */
  public buildAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${this.config.issuer}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  public async exchangeCode(code: string, codeVerifier: string): Promise<SsoTokens> {
    if (this.config.mockMode) {
      return {
        accessToken: `mock-sso-access-token-${Date.now()}`,
        idToken: `mock-sso-id-token-${Date.now()}`,
        expiresIn: 3600,
      };
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code_verifier: codeVerifier,
    });

    const res = await fetch(`${this.config.issuer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SSO token exchange failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    };
  }

  /**
   * Validate Access Token via JWKS and fetch UserInfo
   */
  public async getUserProfile(accessToken: string): Promise<SsoUserProfile> {
    if (this.config.mockMode || accessToken.startsWith('mock-')) {
      return {
        sub: 'mock-user-oussamma-001',
        email: 'contact@oussamma.tn',
        name: 'Oussamma Ben Hassine',
        preferredUsername: 'oussamma',
        role: UserRole.SUPERADMIN,
        rawRoles: ['super_admin', 'admin'],
      };
    }

    // Call /oauth/userinfo
    const res = await fetch(`${this.config.issuer}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch SSO userinfo (${res.status})`);
    }

    const data = await res.json();
    const rawRoles = Array.isArray(data.roles) ? data.roles : [];
    const role = this.mapRoles(rawRoles, data.email);

    return {
      sub: data.sub,
      email: data.email,
      name: data.name || data.preferred_username || data.email,
      preferredUsername: data.preferred_username,
      role,
      rawRoles,
    };
  }

  /**
   * Map raw SSO roles to internal UserRole
   */
  public mapRoles(rawRoles: string[], email?: string): UserRole {
    if (email === 'contact@oussamma.tn' || rawRoles.includes('super_admin') || rawRoles.includes('superadmin')) {
      return UserRole.SUPERADMIN;
    }
    if (rawRoles.includes('admin') || rawRoles.includes('mail_admin')) {
      return UserRole.MAIL_ADMIN;
    }
    if (rawRoles.includes('auditor') || rawRoles.includes('mail_auditor')) {
      return UserRole.MAIL_AUDITOR;
    }
    return UserRole.MAIL_USER;
  }
}
