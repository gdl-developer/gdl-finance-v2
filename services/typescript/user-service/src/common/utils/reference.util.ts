import { randomBytes } from 'crypto';

/**
 * Returns OSWAPS-<20-digit-hex> style reference.
 * Example: OSWAPS-9f4a7b2e3c1d4f5a7b2e
 */
export function generateOswapsReference(): string {
  return `OSWAPS-${randomBytes(10).toString('hex')}`; // 10 bytes -> 20 hex chars
}
