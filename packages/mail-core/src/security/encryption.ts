import crypto from 'node:crypto';

export class CryptoSecurity {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Derive a 32-byte key from master secret
   */
  private static getKey(masterKey?: string): Buffer {
    const key = masterKey || process.env.APP_CREDENTIAL_ENCRYPTION_KEY || 'default-dev-insecure-master-key-32bytes!';
    return crypto.createHash('sha256').update(key).digest();
  }

  /**
   * Encrypt sensitive string using AES-256-GCM
   * Returns base64 string formatted as: iv:authTag:ciphertext
   */
  public static encrypt(plainText: string, masterKey?: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = this.getKey(masterKey);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt AES-256-GCM encrypted payload
   */
  public static decrypt(cipherTextWithMeta: string, masterKey?: string): string {
    const parts = cipherTextWithMeta.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const [ivB64, authTagB64, encryptedB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const key = this.getKey(masterKey);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a new Machine-to-Machine API key
   * Format: mk_live_<random_hex>
   */
  public static generateApiKey(environment: 'live' | 'test' = 'live'): { rawKey: string; keyPrefix: string; keyHash: string } {
    const randomPart = crypto.randomBytes(24).toString('hex');
    const rawKey = `mk_${environment}_${randomPart}`;
    const keyPrefix = rawKey.substring(0, 11); // e.g. "mk_live_a1b"
    const keyHash = this.hashApiKey(rawKey);

    return { rawKey, keyPrefix, keyHash };
  }

  /**
   * Hash API key using SHA-256
   */
  public static hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Verify raw API key against stored hash
   */
  public static verifyApiKey(rawKey: string, storedHash: string): boolean {
    const computedHash = this.hashApiKey(rawKey);
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  }
}
