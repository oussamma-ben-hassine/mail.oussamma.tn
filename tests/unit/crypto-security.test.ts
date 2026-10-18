import test from 'node:test';
import assert from 'node:assert';
import { CryptoSecurity } from '../../packages/mail-core/src/security/encryption.ts';

test('CryptoSecurity - Symmetric AES-256-GCM encryption & decryption', () => {
  const secretKey = 'test-master-key-strictly-32bytes';
  const plainText = 'MonMotDePasseBoiteMailSuperSecret2026!';

  const encrypted = CryptoSecurity.encrypt(plainText, secretKey);

  // Le payload chiffré doit contenir IV, AuthTag et Ciphertext séparés par deux deux-points
  const parts = encrypted.split(':');
  assert.strictEqual(parts.length, 3);
  assert.notStrictEqual(encrypted, plainText);

  // Déchiffrement
  const decrypted = CryptoSecurity.decrypt(encrypted, secretKey);
  assert.strictEqual(decrypted, plainText);
});

test('CryptoSecurity - Tampered encrypted payload throws error', () => {
  const secretKey = 'test-master-key-strictly-32bytes';
  const encrypted = CryptoSecurity.encrypt('SecretData', secretKey);

  // Modification frauduleuse d'un caractère du ciphertext
  const tampered = encrypted.substring(0, encrypted.length - 2) + 'AA';

  assert.throws(() => {
    CryptoSecurity.decrypt(tampered, secretKey);
  });
});

test('CryptoSecurity - API Key generation, hashing and verification', () => {
  const { rawKey, keyPrefix, keyHash } = CryptoSecurity.generateApiKey('live');

  assert.ok(rawKey.startsWith('mk_live_'));
  assert.strictEqual(rawKey.substring(0, 11), keyPrefix);
  assert.ok(keyHash.length === 64); // SHA-256 hex length

  // Vérification de la clé brute contre le hash stocké
  const isValid = CryptoSecurity.verifyApiKey(rawKey, keyHash);
  assert.strictEqual(isValid, true);

  // Vérification d'une mauvaise clé
  const isInvalid = CryptoSecurity.verifyApiKey('mk_live_fraudulent_key_12345', keyHash);
  assert.strictEqual(isInvalid, false);
});
