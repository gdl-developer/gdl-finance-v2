import { Module } from '@nestjs/common';
import { AuthService } from './auth-service/auth-service.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './jwt/local.strategy';
import { JwtStrategy } from './jwt/jwt.strategy';
// import { JwtModule } from '@nestjs/jwt';
// import { jwtAdminConstants } from './jwt/constants';
import { AdminService } from '../admin/admin.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../admin/entities/admin.entity';
import { ExternalApiCallsModule } from 'src/common/external-api-calls/external-api-calls-module';
import { JwtAuthUtilsModule } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.module';

import { FlexiRequest } from 'src/flexi/entities/flexi-request.entity';

import { EnvModule } from 'src/common/env.module';
import { AdminAuthActions } from './entities/auth.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuthActions, Admin, FlexiRequest]),
    PassportModule,
    JwtAuthUtilsModule,
    ExternalApiCallsModule,
    EnvModule,
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, AdminService],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
