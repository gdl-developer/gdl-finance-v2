import { Injectable, Logger, NotAcceptableException } from '@nestjs/common';
import { AuditLoggerService } from '../audit-logger.service';
import { JwtAuthUtilsService } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.service';
import { EnvService } from 'src/common/env.service';

@Injectable()
export class AccessValidator {
  private readonly logger = new Logger(AccessValidator.name);
  private readonly REFRESH_AUTH: string;

  constructor(
    private readonly auditLoggerService: AuditLoggerService,
    private readonly jwtAuthUtilsService: JwtAuthUtilsService,
    private readonly envService: EnvService,
  ) {
    this.REFRESH_AUTH = this.envService.read().REFRESH_AUTH;
  }

  /**
   * Validate refresh token and extract user information
   */
  async getUserWithRefreshToken(refresh_token: string) {
    this.logger.debug('Validating refresh token for user authentication...');

    try {
      const payload = await this.jwtAuthUtilsService.validateRefreshToken(
        refresh_token,
        this.REFRESH_AUTH,
      );

      const {
        user_id,
        account,
        user_ref,
        user_type,
        user_name,
        roles,
        client_ip,
      } = payload || {};

      if (!roles || !user_type || !user_id) {
        this.logger.warn('Refresh token validation failed or missing claims');
        throw new NotAcceptableException('Unauthorized Request');
      }

      this.logger.debug(`User ${user_id} validated successfully`);

      return {
        user_id,
        account,
        user_ref,
        user_type,
        user_name,
        roles,
        client_ip,
      };
    } catch (error) {
      this.logger.error('Error validating user access token', error.stack);
      throw new NotAcceptableException('Unauthorized Request');
    }
  }

  /**
   * Insert audit log entry
   */
  async insertLog(data: any) {
    try {
      await this.auditLoggerService.insert(data);
    } catch (error) {
      this.logger.error('Error inserting audit log', error.stack);
      // Mask system details from external response
      throw new NotAcceptableException('Unauthorized Request');
    }
  }

  async validateHeaders(headers: any) {
    this.logger.debug('Validating headers for refresh token presence...');

    const refresh_token =
      headers['bearerauth'] ||
      headers['BearerAuth'] ||
      headers['authorization']?.replace('Bearer ', '');

    if (!refresh_token) {
      this.logger.warn('Missing or malformed authentication header');
      return null;
    }

    this.logger.debug('Refresh token extracted successfully');
    return refresh_token;
  }
}
