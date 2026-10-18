import test from 'node:test';
import assert from 'node:assert';
import { SmtpMailProvider } from '../../packages/mail-core/src/smtp/smtp-provider.ts';

test('SmtpMailProvider - Simulated delivery mode prevents real external sending', async () => {
  const provider = new SmtpMailProvider({
    host: 'smtp.mailu.local',
    port: 587,
    secure: false,
    simulated: true,
  });

  const isConnected = await provider.verifyConnection();
  assert.strictEqual(isConnected, true);

  const res = await provider.sendEmail({
    from: 'test@oussamma.tn',
    to: ['external-recipient@example.com'],
    subject: 'Test message',
    text: 'Ceci est un test en mode simulé.',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.provider, 'simulated-smtp');
  assert.ok(res.messageId.length > 0);

  // Le message est bien archivé dans le journal simulé en mémoire
  const log = provider.getSimulatedLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].options.subject, 'Test message');
});
