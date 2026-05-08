import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class HstsMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Add the Strict-Transport-Security header to enforce HTTPS
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    // Set X-Content-Type-Options to prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Set X-Frame-Options to deny iframe embedding (redundant with frameguard, but added for compatibility)
    res.setHeader('X-Frame-Options', 'DENY');

    // Set Permissions-Policy to restrict browser features
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()',
    );

    next();
  }
}
