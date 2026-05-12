import { Injectable, NotAcceptableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

import * as dotenv from 'dotenv'; // Load environment variables
dotenv.config();

const ACCESS_AUTH = process.env.ACCESS_AUTH || 'your_access_auth_secret';
const IV_LENGTH = 16; // AES block size for CBC mode
const ENCRYPTION_KEY = process.env.PAYLOAD_ENCRYPTION_SECRET || 'your_payload_encryption_secret_32'; // Must be 32 bytes for aes-256

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
    let encrypted = cipher.update(JSON.stringify(payload));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Concatenate IV and encrypted data
  }

  // AES-256-CBC Decryption
  decryptPayload(encryptedPayload: string): Record<string, any> {
    const [iv, encryptedData] = encryptedPayload.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      Buffer.from(iv, 'hex'),
    );
    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(decrypted.toString());
  }

  // Generate a unique fingerprint based on user and IP
  generateFingerprint(user_email: string, client_ip: string): string {
    const userAgent = user_email + client_ip; // Use a combination of user-specific and client-specific data
    return crypto.createHash('sha256').update(userAgent).digest('hex');
  }

  // Validate the fingerprint to prevent token replay
  validateFingerprint(fingerprint: string, username: string, clientIp: string) {
    const expectedFingerprint = this.generateFingerprint(username, clientIp);
    if (expectedFingerprint !== fingerprint) {
      throw new Error('Not Allowed. Fingerprint mismatch!');
    }
  }

  // 5. Verify the JTI for replay protection
  checkIfJtiUsed(jti: string): boolean {
    // Cleanup expired JTIs before each check
    this.cleanupExpiredJtis();

    return this.usedJtis.has(jti);
  }

  // 6. Mark the JTI as used and store expiration time
  markJtiAsUsed(jti: string, exp: number): void {
    this.usedJtis.set(jti, exp); // Store JTI with its expiration time
  }

  // Clear used JTIs (for cleanup purposes or testing)
  clearUsedJtis(): void {
    this.usedJtis.clear();
  }

  // Cleanup method to remove expired JTIs
  private cleanupExpiredJtis() {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

    // Iterate through the JTIs and remove the ones that have expired
    for (const [jti, exp] of this.usedJtis.entries()) {
      if (exp < currentTime) {
        this.usedJtis.delete(jti); // Remove expired JTI
      }
    }
  }

  async jwTSign(
    encryptedPayload: string,
    SIGN_KEY: string,
    expiresIn?: string,
  ) {
    const token = this.jwtService.sign(
      { data: encryptedPayload },
      {
        algorithm: 'HS256',
        expiresIn: expiresIn || '5m',
        secret: SIGN_KEY,
      },
    );

    return token;
  }

  // Middleware to verify and handle tokens securely (integrated into the app)
  async validateToken(
    token: string,
    clientIp: string,
    enforceReplayProtection: boolean,
    AUTH_KEY?: string,
  ) {
    try {
      // 1. Verify the token with the correct secret and algorithm
      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: AUTH_KEY || ACCESS_AUTH, // Use the same secret key that was used during signing
        algorithms: ['HS256'], // Ensure a strong algorithm is enforced
      });

      // 2. Decrypt the payload to get the original data
      const decryptedPayload = this.decryptPayload(decodedToken.data);

      // 3. Extract the necessary details from the decrypted payload
      const { fingerprint, jti, username, exp } = decryptedPayload;

      // 4. Verify the fingerprint (to bind token to the client)
      this.validateFingerprint(fingerprint, username, clientIp);

      // 5. Verify the JTI for replay protection
      if (enforceReplayProtection) {
        if (this.checkIfJtiUsed(jti)) {
          throw new Error('The token has already been used.');
        }

        //6. Mark the JTI as used, associating it with its expiration time
        this.markJtiAsUsed(jti, exp);
      }

      // 7. If all checks pass, return the decrypted payload (user data)
      return decryptedPayload;
    } catch (error) {
      // Handle token expiration or invalid token
      if (error.name === 'TokenExpiredError') {
        throw new NotAcceptableException('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new NotAcceptableException('Invalid access token');
      } else {
        throw new NotAcceptableException(
          `Token verification failed: ${error.message}`,
        );
      }
    }
  }

  async validateRefreshToken(token: string, AUTH_KEY: string) {
    try {
      // 1. Verify the token with the correct secret and algorithm
      const decodedToken = await this.jwtService.verifyAsync(token, {
        secret: AUTH_KEY, // Use the same secret key that was used during signing
        algorithms: ['HS256'], // Ensure a strong algorithm is enforced
      });

      // 2. Decrypt the payload to get the original data
      const decryptedPayload = this.decryptPayload(decodedToken.data);

      // 3. If all checks pass, return the decrypted payload (user data)
      return decryptedPayload;
    } catch (error) {
      // Handle token expiration or invalid token
      if (error.name === 'TokenExpiredError') {
        throw new NotAcceptableException('Access token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new NotAcceptableException('Invalid access token');
      } else {
        throw new NotAcceptableException(
          `Token verification failed: ${error.message}`,
        );
      }
    }
  }
}
