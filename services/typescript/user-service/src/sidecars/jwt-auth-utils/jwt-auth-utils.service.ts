import { Injectable, NotAcceptableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import * as dotenv from 'dotenv'; // Load environment variables
dotenv.config();

const ACCESS_AUTH = process.env.ACCESS_AUTH || 'your_access_auth_secret';
const IV_LENGTH = 16; // AES block size for CBC mode
const ENCRYPTION_KEY =
  process.env.PAYLOAD_ENCRYPTION_SECRET || 'your_payload_encryption_secret_32'; // Must be 32 bytes for aes-256

@Injectable()
export class JwtAuthUtilsService {
  constructor(private jwtService: JwtService) {}

  private usedJtis = new Map<string, number>();

  // AES-256-CBC Encryption
  encryptPayload(payload: Record<string, unknown>): string {
    const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // AES-256-CBC Decryption
  decryptPayload(encryptedData: string): Record<string, unknown> {
    const [ivHex, encryptedText] = encryptedData.split(':');
    if (!ivHex || !encryptedText) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  /**
   * Generates a stateless JWE-like encrypted token
   * @param payload User data to encode
   * @param expiresIn Expiration time (e.g., '1h', '7d')
   */
  async generateEncryptedToken(
    payload: Record<string, any>,
    expiresIn = '1h',
  ): Promise<string> {
    // 1. Encrypt sensitive payload
    const encryptedPayload = this.encryptPayload(payload);

    // 2. Sign with JWT
    return this.jwtService.sign(
      { data: encryptedPayload },
      {
        secret: ACCESS_AUTH,
        expiresIn,
        jwtid: crypto.randomBytes(16).toString('hex'),
      },
    );
  }

  /**
   * Decodes and decrypts a stateless token
   * @param token The JWT string
   */
  async decodeEncryptedToken(token: string): Promise<Record<string, any>> {
    try {
      // 1. Verify and decode JWT
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: ACCESS_AUTH,
      });

      if (!decoded.data) {
        throw new NotAcceptableException('Invalid token structure');
      }

      // 2. Anti-replay check (Optional: check JTI)
      if (this.usedJtis.has(decoded.jti)) {
        throw new NotAcceptableException('Token has already been used');
      }

      // 3. Decrypt payload
      return this.decryptPayload(decoded.data);
    } catch (error) {
      throw new NotAcceptableException('Invalid or expired token');
    }
  }

  /**
   * Invalidate a token (for single-use scenarios like password reset)
   */
  invalidateJti(jti: string, ttlSeconds = 3600): void {
    this.usedJtis.set(jti, Date.now() + ttlSeconds * 1000);
  }

  // Cleanup expired JTIs
  private cleanupJtis(): void {
    const now = Date.now();
    for (const [jti, expiry] of this.usedJtis.entries()) {
      if (now > expiry) {
        this.usedJtis.delete(jti);
      }
    }
  }
}
