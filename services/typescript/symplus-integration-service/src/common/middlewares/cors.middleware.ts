import { Injectable, NestMiddleware } from "@nestjs/common";
import { getClientIp } from "request-ip";
import { ConfigService } from "@nestjs/config";
import * as tls from "tls";

@Injectable()
export class CorsMiddleware implements NestMiddleware {
  private readonly allowedOrigins: string[] | "*" = [];
  private readonly allowedMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ];
  private readonly allowedHeaders = [
    "Content-Type",
    "Authorization",
    "BearerAuth",
    "bearerauth",
    "Origin",
    "X-Mobile-App",
  ];
  private readonly whitelistIp: string;
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    const origins = this.config.get<string>("ALLOWED_ORIGINS");
    this.allowedOrigins = origins === "*" ? "*" : origins?.split(",") || [];

    this.whitelistIp = this.config.get<string>("WHITELIST_IP") || "";
    const nodeEnv = (this.config.get<string>("NODE_ENV") || "").toLowerCase();
    this.isDev =
      nodeEnv === "development" || nodeEnv === "dev" || nodeEnv === "staging";
  }

  private isSecureRequest(req: any): boolean {
    const xForwardedProto = req.headers["x-forwarded-proto"];
    const xForwardedScheme = req.headers["x-forwarded-scheme"];
    const xScheme = req.headers["x-scheme"];
    const cfVisitorHeader = req.headers["cf-visitor"];
    const host = req.headers["host"] || "";

    let cfVisitorScheme = "";
    if (cfVisitorHeader) {
      try {
        cfVisitorScheme = JSON.parse(cfVisitorHeader as string).scheme;
      } catch {
        cfVisitorScheme = "";
      }
    }

    return (
      (xForwardedProto &&
        (xForwardedProto as string).toLowerCase().includes("https")) ||
      (xForwardedScheme &&
        (xForwardedScheme as string).toLowerCase().includes("https")) ||
      (xScheme && (xScheme as string).toLowerCase().includes("https")) ||
      (cfVisitorScheme && cfVisitorScheme.toLowerCase().includes("https")) ||
      req.protocol === "https" ||
      host.includes(":443") ||
      req.connection?.encrypted === true ||
      req.socket?.encrypted === true ||
      req.socket instanceof tls.TLSSocket
    );
  }

  private isWhitelistedIp(clientIp: string | null): boolean {
    if (!clientIp) return false;
    const ip = clientIp.replace("::ffff:", "");
    const whitelist = (this.whitelistIp || "").split(",").map((i) => i.trim());

    const isPrivate =
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip === "localhost" ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip);

    return whitelist.includes(ip) || isPrivate;
  }

  private handlePreflight(req: any, res: any) {
    const origin = req.headers.origin;
    res.header("Access-Control-Allow-Methods", this.allowedMethods.join(","));
    res.header("Access-Control-Allow-Headers", this.allowedHeaders.join(","));
    res.header("Access-Control-Allow-Credentials", "true");

    if (this.isDev || this.allowedOrigins === "*") {
      res.header("Access-Control-Allow-Origin", origin || "*");
    } else if (
      Array.isArray(this.allowedOrigins) &&
      this.allowedOrigins.includes(origin)
    ) {
      res.header("Access-Control-Allow-Origin", origin);
    }

    res.sendStatus(204);
  }

  private blockRequest(res: any, reason = "Access denied") {
    console.warn(`[SECURITY] Request blocked: ${reason}`);
    return res.status(403).json({ message: reason });
  }

  use(req: any, res: any, next: () => void) {
    const origin = req.headers.origin;
    const clientIp = getClientIp(req);

    console.log(
      `[CORS DEBUG] Request: ${req.method} ${req.originalUrl}, Origin: [${origin}], isDev: ${this.isDev}`
    );

    // Allow all in dev
    if (this.isDev) {
      res.header("Access-Control-Allow-Origin", origin || "*");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", this.allowedHeaders.join(","));
      res.header("Access-Control-Allow-Methods", this.allowedMethods.join(","));

      if (req.method === "OPTIONS") return res.sendStatus(204);
      return next();
    }

    // Production mode
    if (!this.isSecureRequest(req)) {
      if (this.isWhitelistedIp(clientIp) || req.headers["bearerauth"]) {
        console.log(
          `[CORS][PROD] Allowing internal service request from ${clientIp} (bypassing HTTPS check)`
        );
      } else {
        return this.blockRequest(res, "Non-HTTPS request blocked");
      }
    }

    if (req.method === "OPTIONS") {
      if (
        this.allowedOrigins === "*" ||
        (Array.isArray(this.allowedOrigins) &&
          this.allowedOrigins.includes(origin)) ||
        !origin
      ) {
        return this.handlePreflight(req, res);
      }
      return this.blockRequest(res, "Disallowed CORS origin");
    }

    if (!origin) {
      if (this.isWhitelistedIp(clientIp) || req.headers["bearerauth"]) {
        return next();
      }
      return this.blockRequest(res, "Request without origin blocked");
    }

    if (this.allowedOrigins === "*" || this.allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      return next();
    }

    return this.blockRequest(res, `Origin not allowed: ${origin}`);
  }
}
