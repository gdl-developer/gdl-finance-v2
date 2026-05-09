import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { getClientIp } from 'request-ip';
import * as dotenv from 'dotenv';
dotenv.config();

const WHITELIST_IPS = [
  process.env.WHITELIST_IP,
  process.env.OFFICE_NETWORK_IP,
].filter(Boolean); // Filter out undefined/null values

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  // Create the rate limiter once
  private limiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
    max: 1000, // limit each IP to 1000 requests per windowMs (Relaxed from 100)
    message: 'Too many requests from this IP, please try again after an hour.',
    headers: true,
    handler: (req, res) => {
      console.log(`Rate limit exceeded for IP: ${getClientIp(req)}`);
      return res.status(429).json({
        message: 'Request Limits Exceeded',
      });
    },
  });

  private isWhitelisted(clientIp: string): boolean {
    return WHITELIST_IPS.some((whitelistedIp) =>
      this.isIpMatch(clientIp, whitelistedIp),
    );
  }

  private isIpMatch(clientIp: string, whitelistedIp: string): boolean {
    // Add more sophisticated CIDR matching if needed
    return clientIp === whitelistedIp;
  }

  use(req: any, res: any, next: () => void) {
    const clientIp = getClientIp(req) || req.headers['x-forwarded-for'];

    // Log incoming requests for auditing
    console.log(`Incoming request from IP: ${clientIp}`);

    // Check if the request comes from the trusted IPs
    if (this.isWhitelisted(clientIp)) {
      console.log(`IP ${clientIp} is whitelisted, skipping rate limiting`);
      return next();
    }

    // Apply the rate limiter for all other IPs
    this.limiter(req, res, next);
  }
}
