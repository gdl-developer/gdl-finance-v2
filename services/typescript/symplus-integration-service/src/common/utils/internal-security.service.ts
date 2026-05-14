import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class InternalSecurityService {
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>("INTERNAL_SECURITY_KEY");
    if (!this.secretKey) {
      console.warn(
        "⚠️ INTERNAL_SECURITY_KEY is not defined in environment variables"
      );
    }
  }

  /**
   * Generates an HMAC signature for an internal request
   */
  signRequest(
    method: string,
    urlPath: string,
    body?: any
  ): { signature: string; timestamp: string } {
    const timestamp = Date.now().toString();
    const canonicalString = this.createCanonicalString(
      method,
      urlPath,
      timestamp,
      body
    );

    const signature = crypto
      .createHmac("sha256", this.secretKey || "default_secret")
      .update(canonicalString)
      .digest("hex");

    return { signature, timestamp };
  }

  /**
   * Verifies an HMAC signature from an incoming internal request
   */
  verifySignature(
    signature: string,
    timestamp: string,
    method: string,
    urlPath: string,
    body?: any
  ): boolean {
    if (!signature || !timestamp) return false;

    // Check if the request is too old (prevent replay attacks - 60 seconds window)
    const now = Date.now();
    const requestTime = parseInt(timestamp, 10);
    if (isNaN(requestTime) || Math.abs(now - requestTime) > 60000) {
      console.warn(
        "❌ Internal Security: Signature expired or timestamp invalid"
      );
      return false;
    }

    const canonicalString = this.createCanonicalString(
      method,
      urlPath,
      timestamp,
      body
    );
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey || "default_secret")
      .update(canonicalString)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Uint8Array.from(sigBuffer),
      Uint8Array.from(expectedBuffer)
    );

    if (!isValid) {
      console.warn(
        `❌ Internal Security: Signature mismatch. Expected: ${expectedSignature}, Received: ${signature}`
      );
      console.debug(
        `[Security] Canonical String used for verification: ${canonicalString}`
      );
    }

    return isValid;
  }

  private createCanonicalString(
    method: string,
    urlPath: string,
    timestamp: string,
    body?: any
  ): string {
    // 1. Normalize path: remove domain if present, and remove query params
    let purePath = urlPath;
    try {
      if (urlPath.includes("://")) {
        const urlObj = new URL(urlPath);
        purePath = urlObj.pathname;
      } else {
        purePath = urlPath.split("?")[0];
      }
    } catch (e) {
      purePath = urlPath.split("?")[0];
    }

    // Ensure path starts with /
    if (!purePath.startsWith("/")) {
      purePath = "/" + purePath;
    }

    // 2. Normalize body: handle empty, simple, and complex objects
    let bodyString = "";
    if (body && Object.keys(body).length > 0) {
      try {
        // Sort keys to ensure consistency
        const sortedBody = this.sortObjectKeys(body);
        bodyString = JSON.stringify(sortedBody);
      } catch (e) {
        bodyString = "";
      }
    }

    return `${method.toUpperCase()}|${purePath}|${timestamp}|${bodyString}`;
  }

  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return obj;
    }
    const sortedKeys = Object.keys(obj).sort();
    const result: any = {};
    for (const key of sortedKeys) {
      result[key] = this.sortObjectKeys(obj[key]);
    }
    return result;
  }
}
