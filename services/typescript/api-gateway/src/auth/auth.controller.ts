import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthGuard } from '../common/guards/auth.guard';
import { firstValueFrom } from 'rxjs';

import { IdentityResponse, UserProfile } from './interfaces/identity.interface';
import { AuthenticatedRequest } from './interfaces/request.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(
    @Body() loginDto: Record<string, string>,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const payload = {
      ...loginDto,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    };

    try {
      const result = (await firstValueFrom(
        this.authService.login(payload),
      )) as IdentityResponse;

      if (result && result.success && result.token) {
        void res.setCookie('access_token', result.token, {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'strict',
          maxAge: 15 * 60,
        });

        return res.send({
          success: true,
          message: 'Login successful',
          data: { user_id: result.user_id },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    } catch (e) {
      if (e.code === 16 || e.status === 401) {
        throw new UnauthorizedException('Invalid credentials');
      }
      throw e;
    }
  }

  @UseGuards(AuthGuard)
  @Post('set-pin')
  setPin(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.authService.setPin({
      user_id: req.user.user_id,
      pin: body.pin,
      type: body.type, // LOGIN or TRANSACTION
    });
  }

  @UseGuards(AuthGuard)
  @Post('verify-pin')
  verifyPin(@Req() req: AuthenticatedRequest, @Body() body: any) {
    return this.authService.verifyPin({
      user_id: req.user.user_id,
      pin: body.pin,
      type: body.type,
    });
  }
}
