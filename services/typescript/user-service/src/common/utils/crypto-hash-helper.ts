import * as CryptoJS from 'crypto-js';

export function encrypt(data: string, key: string): string {
  const cipher = CryptoJS.AES.encrypt(data, key).toString();
  return cipher;
}

export function decrypt(encrypted: string, key: string): string {
  try {
    // Ensure input looks valid (base64-like)
    if (
      !encrypted ||
      typeof encrypted !== 'string' ||
      !/^[A-Za-z0-9+/=]+$/.test(encrypted)
    ) {
      throw new Error('Invalid encrypted token format');
    }

    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
      throw new Error(
        'Decryption returned empty string — possibly wrong key or encoding',
      );
    }

    return decrypted;
  } catch (err) {
    console.error('❌ CryptoJS decrypt error:', err.message);
    throw new Error('Malformed UTF-8 data or invalid encryption key');
  }
}
