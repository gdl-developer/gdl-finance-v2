import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './jwt/local.strategy';
import { JwtStrategy } from './jwt/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthActions } from './entities/auth.entity';
import { UserAccountModule } from '../user/user.module';
import { KycLevelsModule } from 'src/kyc-levels/kyc-levels.module';
import { AccountSettingsModule } from '../account-settings/account-settings.module';
import { SecurityQuestionsModule } from 'src/security-questions/security-questions.module';
import { LoginHistoryModule } from '../login-history/login-history.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NubanAccountsModule } from 'src/sidecars/nuban-accounts/nuban-accounts.module';
import { JwtAuthUtilsModule } from 'src/sidecars/jwt-auth-utils/jwt-auth-utils.module';
import { AccessValidatorModule } from 'src/common/audit-logger/access-validator/access-validator.module';
import { AbilityModule } from 'src/common/casl-ability-rbac/ability.module';
import { DeviceModule } from '../device-details/device-details.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthActions]),
    UserAccountModule,
    PassportModule,
    KycLevelsModule,
    AccountSettingsModule,
    SecurityQuestionsModule,
    NubanAccountsModule,
    LoginHistoryModule,
    JwtAuthUtilsModule,
    AbilityModule,
    AccessValidatorModule,
    DeviceModule,
    // For RabbitMQ //
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            'amqps://xelxcxmr:8MleLiv3P4IxF4b45nktMfrgHxWwbupm@sparrow.rmq.cloudamqp.com/xelxcxmr',
          ],
          queue: 'notify_queue',
          queueOptions: {
            durable: false,
          },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
