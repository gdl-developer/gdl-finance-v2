/**
 * Sanitizes sensitive data from objects before logging
 * Redacts passwords, tokens, pins, and other sensitive fields
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'password_confirm',
    'old_password',
    'new_password',
    'txn_pin',
    'new_txn_pin',
    'transactionPin',
    'pin',
    'token',
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'bearerauth',
    'authorization',
    'secret',
    'api_key',
    'apiKey',
    'bvn',
    'account_number',
    'card_number',
    'cvv',
    'otp',
    'request_otp',
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (
      sensitiveFields.some((field) =>
        key.toLowerCase().includes(field.toLowerCase()),
      )
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Sanitizes a string for logging by redacting common patterns
 */
export function sanitizeString(str: string): string {
  if (!str) return str;

  // Redact email addresses (keep domain for debugging)
  str = str.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/g, '***@$2');

  // Redact phone numbers
  str = str.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '***-***-****');

  // Redact BVN (11 digits)
  str = str.replace(/\b\d{11}\b/g, '***********');

  // Redact account numbers (10 digits)
  str = str.replace(/\b\d{10}\b/g, '**********');

  return str;
}
