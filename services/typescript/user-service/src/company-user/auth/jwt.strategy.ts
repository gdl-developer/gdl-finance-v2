import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CompanyUserService } from '../company-user.service';

// Validate JWT secret at module load time

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private companyUserService: CompanyUserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    try {
      const user = await this.companyUserService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        companyId: payload.companyId,
        permissions: payload.permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token payload');
    }
  }
}
