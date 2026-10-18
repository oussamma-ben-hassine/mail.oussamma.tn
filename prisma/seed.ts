import { PrismaClient, UserRole } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data for Mail.oussamma.tn...');

  // 1. Initial Domain
  const domain = await prisma.mailDomain.upsert({
    where: { name: 'oussamma.tn' },
    update: {},
    create: {
      name: 'oussamma.tn',
      isVerified: true,
      spfVerified: true,
      dkimVerified: true,
      dmarcVerified: true,
      dkimSelector: 'mail',
    },
  });
  console.log(`Domain initialized: ${domain.name}`);

  // 2. Superadmin User Identity
  const superadmin = await prisma.userIdentity.upsert({
    where: { email: 'contact@oussamma.tn' },
    update: { role: UserRole.superadmin },
    create: {
      sub: 'usr-sso-oussamma-master',
      email: 'contact@oussamma.tn',
      name: 'Oussamma Ben Hassine',
      preferredName: 'Oussamma',
      role: UserRole.superadmin,
    },
  });
  console.log(`Superadmin identity initialized: ${superadmin.email}`);

  // 3. Superadmin Mailbox
  const mailbox = await prisma.mailbox.upsert({
    where: { email: 'contact@oussamma.tn' },
    update: {},
    create: {
      domainId: domain.id,
      email: 'contact@oussamma.tn',
      displayName: 'Oussamma Ben Hassine',
      quotaBytes: BigInt(10737418240), // 10 Go
    },
  });

  await prisma.mailboxMember.upsert({
    where: {
      mailboxId_userId: {
        mailboxId: mailbox.id,
        userId: superadmin.id,
      },
    },
    update: {},
    create: {
      mailboxId: mailbox.id,
      userId: superadmin.id,
      role: 'owner',
    },
  });
  console.log(`Mailbox initialized: ${mailbox.email}`);

  // 4. Default Application (Ecosystem Portal)
  const app = await prisma.mailApplication.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: superadmin.id,
      name: 'Portail oussamma.tn',
      description: 'Application centrale de notification et transactions',
      allowedSenderDomains: ['oussamma.tn'],
      defaultFromEmail: 'noreply@oussamma.tn',
      defaultFromName: 'Écosystème oussamma.tn',
      dailyQuota: 5000,
      rateLimitPerMinute: 120,
      scopes: ['mail:send', 'mail:batch_send', 'mail:read_status', 'mail:templates:read'],
    },
  });

  // Default API Key for Portal
  const apiKeyHash = crypto.createHash('sha256').update('mk_live_portal_default_secret_key_2026').digest('hex');
  await prisma.apiCredential.upsert({
    where: { keyHash: apiKeyHash },
    update: {},
    create: {
      applicationId: app.id,
      label: 'Clé Système Portail',
      keyPrefix: 'mk_live_por',
      keyHash: apiKeyHash,
    },
  });
  console.log(`Application initialized: ${app.name}`);

  // 5. Standard Templates
  const welcomeTpl = await prisma.emailTemplate.upsert({
    where: { name: 'welcome_ecosystem' },
    update: {},
    create: {
      name: 'welcome_ecosystem',
      description: 'Message de bienvenue pour nouvel utilisateur',
      ownerId: superadmin.id,
      currentVersion: 1,
      versions: {
        create: {
          version: 1,
          subject: 'Bienvenue sur l’écosystème oussamma.tn, {{user.name}} !',
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
              <h1 style="color: #2563eb; font-size: 22px; font-weight: 800; margin-bottom: 16px;">Bienvenue {{user.name}} 👋</h1>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">Votre compte sur l'écosystème <strong>oussamma.tn</strong> a été créé avec succès.</p>
              <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Identifiant de connexion :</strong> {{user.email}}</p>
              </div>
              <p style="color: #334155; font-size: 14px;">Vous pouvez accéder dès maintenant à tous vos services unifiés : Mail, ByteVault Drive, Messenger et IA.</p>
              <div style="margin-top: 24px; text-align: center;">
                <a href="{{loginUrl}}" style="background: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 10px; display: inline-block;">Accéder à mon espace</a>
              </div>
            </div>
          `,
          textContent: 'Bienvenue sur oussamma.tn. Votre compte a été créé avec succès.',
          sampleData: {
            user: { name: 'Oussamma', email: 'contact@oussamma.tn' },
            loginUrl: 'https://oussamma.tn',
          },
        },
      },
    },
  });
  console.log(`Template initialized: ${welcomeTpl.name}`);

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
