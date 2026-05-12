import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CompanyUserService } from './company-user.service';
import { CompanyUserController } from './company-user.controller';
import { CompanyUserAccountSettingsController } from './company-user-account-settings.controller';
import { CompanyUserAccountSettingsService } from './company-user-account-settings.service';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { CompanyUser } from './entities/company-user.entity';
import { CompanyUserAuthAction } from './entities/company-user-auth-action.entity';
import { CompanyUserAccountSettings } from './entities/company-user-account-settings.entity';
import { JwtStrategy } from './auth/jwt.strategy';
import { Company_profile } from '../admin/company/entities/company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanyUser,
      CompanyUserAuthAction,
      CompanyUserAccountSettings,
      Company_profile,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_secret_key',
      signOptions: { expiresIn: '5m' },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [CompanyUserController, CompanyUserAccountSettingsController],
  providers: [
    CompanyUserService,
    CompanyUserAccountSettingsService,
    TwoFactorAuthenticationService,
    JwtStrategy,
  ],
  exports: [
    CompanyUserService,
    CompanyUserAccountSettingsService,
    TwoFactorAuthenticationService,
  ],
})
export class CompanyUserModule {}
