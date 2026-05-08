import { Injectable, NestMiddleware } from '@nestjs/common';
import { getClientIp } from 'request-ip';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly allowedOrigins: string[] | '*' = [];
  private readonly allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  private readonly allowedHeaders = [
    'Content-Type',
    'Authorization',
    'BearerAuth',
    'bearerauth',
    'Origin',
    'X-Mobile-App',
    'x-audit-metadata',
  ];
  private readonly whitelistIp: string;
  private readonly mobileAppKey: string;
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    const origins = this.config.get<string>('ALLOWED_ORIGINS');
    this.allowedOrigins = origins === '*' ? '*' : origins?.split(',') || [];

    const rmbBaseUrl = this.config.get<string>('RMB_BASE_API_URL');
    const userBaseUrl = this.config.get<string>('USER_BASE_URL');

    if (Array.isArray(this.allowedOrigins)) {
      // Add RMB_BASE_API_URL
      if (rmbBaseUrl) {
        try {
          const url = new URL(rmbBaseUrl);
          if (!this.allowedOrigins.includes(url.origin)) {
            this.allowedOrigins.push(url.origin);
          }
        } catch (error) {}
      }

      // Add USER_BASE_URL
      if (userBaseUrl) {
        try {
          const url = new URL(userBaseUrl);
          if (!this.allowedOrigins.includes(url.origin)) {
            this.allowedOrigins.push(url.origin);
          }
        } catch (error) {}
      }

      // Add "userservice" literal origin
      if (!this.allowedOrigins.includes('userservice')) {
        this.allowedOrigins.push('userservice');
      }
    }

    this.whitelistIp = this.config.get<string>('WHITELIST_IP') || '';
    this.mobileAppKey = this.config.get<string>('XMobileAppKey') || '';
    const nodeEnv = (this.config.get<string>('NODE_ENV') || '').toLowerCase();
    this.isDev =
      nodeEnv === 'development' || nodeEnv === 'dev' || nodeEnv === 'staging';
    console.log(`[CORS DEBUG] isDev: ${this.isDev}, NODE_ENV: [${nodeEnv}]`);
  }

  private isSecureRequest(req: any): boolean {
    const xForwardedProto = req.headers['x-forwarded-proto'];
    const xForwardedScheme = req.headers['x-forwarded-scheme'];
    const xScheme = req.headers['x-scheme'];
    const cfVisitorHeader = req.headers['cf-visitor'];
    const host = req.headers['host'] || '';

    let cfVisitorScheme = '';
    if (cfVisitorHeader) {
      try {
        cfVisitorScheme = JSON.parse(cfVisitorHeader).scheme;
      } catch {
        cfVisitorScheme = '';
      }
    }

    return (
      (xForwardedProto && xForwardedProto.toLowerCase().includes('https')) ||
      (xForwardedScheme && xForwardedScheme.toLowerCase().includes('https')) ||
      (xScheme && xScheme.toLowerCase().includes('https')) ||
      (cfVisitorScheme && cfVisitorScheme.toLowerCase().includes('https')) ||
      req.protocol === 'https' ||
      host.includes(':443') ||
      req.connection?.encrypted === true ||
      req.socket?.encrypted === true
    );
  }

  private handlePreflight(req: any, res: any) {
    res.header('Access-Control-Allow-Methods', this.allowedMethods.join(','));
    res.header('Access-Control-Allow-Headers', this.allowedHeaders.join(','));
    res.header('Access-Control-Allow-Credentials', 'true');

    if (this.isDev || this.allowedOrigins === '*') {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (
      Array.isArray(this.allowedOrigins) &&
      this.allowedOrigins.includes(req.headers.origin)
    ) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
    }

    res.sendStatus(204);
  }

  private isWhitelistedIp(clientIp: string | null): boolean {
    if (!clientIp) return false;
    const ip = clientIp.replace('::ffff:', '');
    const whitelist = (this.whitelistIp || '')
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    const isPrivate =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === 'localhost' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip);

    return whitelist.includes(ip) || isPrivate;
  }

  private blockRequest(res: any, reason = 'Access denied') {
    console.warn(`[SECURITY] Request blocked: ${reason}`);
    return res.status(403).json({ message: reason });
  }

  use(req: any, res: any, next: () => void) {
    const origin = req.headers.origin;
    const clientIp = getClientIp(req);
    console.log(
      `[CORS DEBUG] Request: ${req.method} ${req.originalUrl}, Origin: [${origin}], isDev: ${this.isDev}`,
    );

    // --- BYPASS FOR CALLBACK URL ONLY ---
    if (req.originalUrl === '/virtual-account/callback') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', this.allowedHeaders.join(','));
      res.header('Access-Control-Allow-Methods', this.allowedMethods.join(','));
      return next(); // Skip ALL security & origin checks
    }

    // --- BYPASS FOR SDK PROBES (Avoid 404 logs) ---
    if (req.originalUrl?.includes('/SDK/webLanguage')) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Headers', this.allowedHeaders.join(','));
      res.header('Access-Control-Allow-Methods', this.allowedMethods.join(','));
      return res
        .status(200)
        .json({ success: true, message: 'SDK Probe Handled' });
    }
    // --- END BYPASS ---

    // Enforce HTTPS in non-dev environments
    if (!this.isDev && !this.isSecureRequest(req)) {
      const isInternal =
        this.isWhitelistedIp(clientIp) || req.headers['bearerauth'];
      const isAuthPath = req.originalUrl?.includes('/auth/');

      if (isInternal || isAuthPath) {
        console.log(
          `[CORS][PROD] Allowing request to ${req.originalUrl} from ${clientIp} (bypassing strict HTTPS check)`,
        );
      } else {
        console.warn(
          `[CORS][PROD] Blocking non-HTTPS request to ${req.originalUrl} from ${clientIp}. Headers: ${JSON.stringify(req.headers)}`,
        );
        return this.blockRequest(res, 'Access denied');
      }
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      if (
        this.isDev ||
        this.allowedOrigins === '*' ||
        this.allowedOrigins.includes(origin)
      ) {
        return this.handlePreflight(req, res);
      }
      return this.blockRequest(res, 'Access denied');
    }

    // Handle requests with no origin
    if (!origin) {
      if (this.isDev) return next();
      if (req.headers['x-mobile-app'] === this.mobileAppKey) return next();

      // Allow internal service requests without origin
      if (
        this.isWhitelistedIp(clientIp) ||
        req.headers['bearerauth'] ||
        req.headers['BearerAuth']
      ) {
        console.log(
          `[CORS] Allowing internal/trusted request from ${clientIp} without origin`,
        );
        return next();
      }

      return this.blockRequest(res, 'Access denied');
    }

    // Allow all in dev
    if (this.isDev) {
      res.header('Access-Control-Allow-Origin', '*');
      return next();
    }

    // Validate origin
    if (this.allowedOrigins === '*' || this.allowedOrigins.includes(origin)) {
      res.header(
        'Access-Control-Allow-Origin',
        this.allowedOrigins === '*' ? '*' : origin,
      );
      res.header('Access-Control-Allow-Credentials', 'true');
      return next();
    }

    return this.blockRequest(res, 'Access denied');
  }
}
