import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private privateKey: string;
  private publicKey: string;

  constructor() {
    // Generate RSA keys on startup (In production, load these from Secrets Manager/Vault)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.logger.log('RSA Key Pair generated for End-to-End Encryption');
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Decrypts a hybrid-encrypted payload.
   * Expects: { encryptedData, encryptedKey, iv }
   */
  decrypt(payload: {
    encryptedData: string;
    encryptedKey: string;
    iv: string;
  }): any {
    try {
      const encryptedKeyBuffer = Buffer.from(payload.encryptedKey, 'base64');

      // 1. Decrypt the AES Key using RSA Private Key
      const aesKey = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha1',
        },
        encryptedKeyBuffer,
      );

      // 2. Decrypt the Data using the AES Key
      const iv = Buffer.from(payload.iv, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);

      const fullBuffer = Buffer.from(payload.encryptedData, 'base64');
      const tag = fullBuffer.slice(-16);
      const data = fullBuffer.slice(0, -16);

      decipher.setAuthTag(tag);
      let decrypted = decipher.update(data, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Insecure payload or decryption failure');
    }
  }

  /**
   * Encrypts a response to send back to the frontend.
   */
  encrypt(data: any, aesKeyBase64: string, ivBase64: string): string {
    const aesKey = Buffer.from(aesKeyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');

    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const tag = cipher.getAuthTag();
    return encrypted + tag.toString('base64');
  }
}
