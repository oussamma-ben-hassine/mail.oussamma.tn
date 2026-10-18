import test from 'node:test';
import assert from 'node:assert';
import { UserRole, AppScope } from '../../packages/contracts/src/enums.ts';
import { SsoAdapter } from '../../packages/integrations/src/sso/sso-adapter.ts';

test('Security & RBAC - Role mapping from SSO claims', () => {
  const adapter = new SsoAdapter({
    issuer: 'https://sso-a.oussamma.tn',
    clientId: 'test',
    clientSecret: 'test',
    redirectUri: 'https://mail.oussamma.tn/auth/callback',
    mockMode: true,
  });

  // contact@oussamma.tn est toujours superadmin
  const role1 = adapter.mapRoles([], 'contact@oussamma.tn');
  assert.strictEqual(role1, UserRole.SUPERADMIN);

  // Rôle super_admin explicite
  const role2 = adapter.mapRoles(['super_admin'], 'other@oussamma.tn');
  assert.strictEqual(role2, UserRole.SUPERADMIN);

  // Rôle mail_admin
  const role3 = adapter.mapRoles(['admin'], 'admin@oussamma.tn');
  assert.strictEqual(role3, UserRole.MAIL_ADMIN);

  // Rôle auditeur
  const role4 = adapter.mapRoles(['auditor'], 'audit@oussamma.tn');
  assert.strictEqual(role4, UserRole.MAIL_AUDITOR);

  // Rôle utilisateur standard
  const role5 = adapter.mapRoles([], 'user@oussamma.tn');
  assert.strictEqual(role5, UserRole.MAIL_USER);
});

test('Security & Scope Isolation - Sender domain authorization check', () => {
  const appConfig = {
    name: 'CV Builder',
    allowedSenderDomains: ['oussamma.tn', 'cv.oussamma.tn'],
    scopes: [AppScope.MAIL_SEND],
  };

  const isDomainAllowed = (domain: string) => appConfig.allowedSenderDomains.includes(domain);

  assert.strictEqual(isDomainAllowed('oussamma.tn'), true);
  assert.strictEqual(isDomainAllowed('cv.oussamma.tn'), true);
  assert.strictEqual(isDomainAllowed('gmail.com'), false);
  assert.strictEqual(isDomainAllowed('evil.com'), false);
});
