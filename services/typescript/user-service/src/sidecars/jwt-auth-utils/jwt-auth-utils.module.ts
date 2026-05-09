import { Module } from '@nestjs/common';
import { JwtAuthUtilsService } from './jwt-auth-utils.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/user/auth/jwt/constants';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [],
  providers: [JwtAuthUtilsService],
  exports: [JwtAuthUtilsService],
})
export class JwtAuthUtilsModule {}
