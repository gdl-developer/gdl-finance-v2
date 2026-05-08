import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KycController } from './kyc.controller';
import { SecurityQuestionsConfigController, UserSecurityQuestionsController } from './security-questions.controller';
import { UserController } from './user.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'IDENTITY_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'identity',
          protoPath: join(__dirname, '../../../../../proto/user.proto'),
          url: process.env.IDENTITY_SERVICE_URL || 'localhost:50052',
        },
      },
    ]),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your_secret_key',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [
    AuthController, 
    KycController, 
    SecurityQuestionsConfigController, 
    UserSecurityQuestionsController,
    UserController,
  ],
  providers: [
    AuthService, 
  ],
  exports: [AuthService],
})
export class AuthModule {}
