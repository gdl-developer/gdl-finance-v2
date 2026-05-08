import {
  Body,
  Controller,
  NotImplementedException,
  Post,
  Req,
  UsePipes,
  ValidationPipe,
  ClassSerializerInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth-service/auth-service.service';
import { ApiTags } from '@nestjs/swagger';
import { ValidateTokenDto } from 'src/user/auth/dto/validate-token.dto';
import { BaseController } from 'src/common/base.controller';
import { AdminLoginDto } from './dto/login.dto';
import { CreateNewPasswordDto } from 'src/user/auth/dto/create-new-password.dto';
import { TokenVerifyActionDto } from 'src/user/auth/dto/forgot-password-action.dto';
import { ForgotPasswordDto } from 'src/user/auth/dto/forgot-password.dto';
import { Request } from 'express';
import { getClientIp } from 'request-ip';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';

@ApiTags('Admin Auth')
@Controller('admin/auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Post('login')
  @AuditLogger('AdminLogin')
  async login(@Body() adminLoginDto: AdminLoginDto, @Req() req: Request) {
    const client_ip = getClientIp(req);
    const response = await this.authService.login(adminLoginDto, client_ip);
    return { success: true, data: response };
  }

  @Post('logout')
  @AuditLogger('AdminLogout')
  async logout() {
    return { success: true, message: 'Logout successful' };
  }

  @Post('validate/user')
  async validateUser(@Body() adminLoginDto: AdminLoginDto) {
    const response = await this.authService.validateUser(adminLoginDto);
    return { success: true, data: response };
  }

  @Post('/forgot/password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const reset = await this.authService.forgotPassword(forgotPasswordDto);

    if (!reset) throw new NotImplementedException('Reset Request Failed');
    return { success: true, data: reset };
  }

  @Post('/token/verify') // for forgot password request
  async confirmForgotPasswordRequest(
    @Body() tokenVerifyActionDto: TokenVerifyActionDto,
  ) {
    const reset =
      await this.authService.tokenVerifyAction(tokenVerifyActionDto);

    if (!reset) throw new NotImplementedException('Reset Confirmation Failed');
    return { success: true, data: reset };
  }

  @Post('/password/new/create')
  async createNewPassword(@Body() createNewPasswordDto: any) {
    console.log('createNewPasswordDto', createNewPasswordDto);
    const reset =
      await this.authService.createNewPassword(createNewPasswordDto);

    if (!reset) throw new NotImplementedException('Reset Confirmation Failed');
    return { success: true, data: reset };
  }

  @Post('validate/token')
  async user(@Body() validateTokenDto: ValidateTokenDto, @Req() req: Request) {
    const client_ip = getClientIp(req);
    const user_data = await this.authService.getUserAfterTokenVerify(
      validateTokenDto,
      client_ip,
    );

    return { success: true, data: user_data };
  }
}
