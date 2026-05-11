import {
  Controller,
  Post,
  Body,
  NotImplementedException,
  Patch,
  Get,
  NotAcceptableException,
  Req,
  Param,
  Res,
  UseGuards,
  UnauthorizedException,
  ClassSerializerInterceptor,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { getClientIp } from 'request-ip';
import { AuthService } from './auth.service';
import { HowYouHeardAboutUs, UserAccount } from '../user/entities/user.entity';
import { LoginDto } from './dto/login-dto';
import { RegisterDto } from './dto/register.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { TokenVerifyActionDto } from './dto/forgot-password-action.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CreateNewPasswordDto } from './dto/create-new-password.dto';
import { RegisterStepTwoDto } from './dto/register-step-two.dto';
import { VerifyEmailLaterDto } from './dto/verify-email-later.dto';
import { SetTempLoginDto } from './dto/set-temp-login.dto';
import { LoginWithhTempPinDto } from './dto/login-with-temp-pin.dto';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { AdminRegisterUserDto } from './dto/admin-register-user.dto';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateDeviceDto } from '../device-details/dto/device-details.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@ApiTags('User Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/1')
  async register(@Body() registerDto: RegisterDto) {
    // Service handles password validation
    const result = await this.authService.register(registerDto);
    return { success: true, data: result };
  }

  @Patch('register/2')
  async registerTwo(
    @Body() registerStepTwoDto: RegisterStepTwoDto,
    @Req() req: Request,
  ) {
    const client_ip = getClientIp(req);
    const u_user = await this.authService.registerSteptwo(
      registerStepTwoDto,
      client_ip,
    );
    return { success: true, data: u_user };
  }

  @Post('admin/register/user')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Create, subject: UserAccount })
  async adminRegisterUser(
    @Body() adminRegisterUserDto: AdminRegisterUserDto,
    @Req() req: Request,
  ) {
    const client_ip = getClientIp(req);
    const user: UserAccount = await this.authService.adminRegisterUser(
      adminRegisterUserDto,
      client_ip,
    );
    return { success: true, data: user };
  }

  @Patch('set/temp/login')
  async setTemporaryLogin(
    @Body() setTempLoginDto: SetTempLoginDto,
    @Req() req: Request,
  ) {
    const client_ip = getClientIp(req);
    const u_user = await this.authService.setTemporaryLogin(
      setTempLoginDto,
      client_ip,
    );
    return { success: true, data: u_user };
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const client_ip = getClientIp(req);
    const { email, password } = loginDto;

    const deviceId = req.headers['x-device-id'] as string;

    const deviceData = {
      browserName: loginDto.browserName,
      userAgent: loginDto.userAgent,
      os: loginDto.os,
      platform: loginDto.platform,
      deviceHash: deviceId || loginDto.device_hash,
    };

    const result = await this.authService.login(
      email,
      password,
      client_ip,
      deviceData,
    );

    if (
      'requires_device_verification' in result &&
      result.requires_device_verification
    ) {
      res.status(202).json({
        success: true,
        status_code: 202,
        response_code: 'DEVICE_VERIFICATION_REQUIRED',
        response_description: 'OTP required to verify new device',
        data: {
          requires_device_verification: true,
          token: result.token,
          email: result.email,
        },
      });
      return;
    }

    // 2FA required
    if ('requires_2fa' in result && result.requires_2fa) {
      res.status(202).json({
        success: true,
        status_code: 202,
        response_code: '2FA_REQUIRED',
        response_description: 'OTP required to complete login',
        data: {
          requires_2fa: true,
          token: result.token,
          email: result.email,
        },
      });
      return;
    }

    // 🚩 Successful login → set cookies and return tokens
    if ('access_token' in result && 'refresh_token' in result) {
      const { access_token, refresh_token } = result;

      res.cookie('access_token', access_token, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 60 * 1000,
        sameSite: 'strict',
      });

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 60 * 1000,
        sameSite: 'strict',
      });

      res.status(201).json({
        success: true,
        status_code: 201,
        response_code: '00',
        response_description: 'Login successful',
        data: result,
      });
      return;
    }

    // 🚩 Fallback for unexpected responses
    res.status(500).json({
      success: false,
      status_code: 500,
      response_code: 'INTERNAL_ERROR',
      response_description: 'Unexpected response from login',
    });
    return;
  }

  @Post('login/verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const client_ip = getClientIp(req);
    const deviceId = req.headers['x-device-id'] as string;

    // Override device_hash from dto with x-device-id if present
    if (deviceId) {
      dto.device_hash = deviceId;
    }

    const result = await this.authService.verifyLoginOtp(dto, client_ip);

    const { access_token, refresh_token } = result;

    // Set access token as HTTP-only cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
      sameSite: 'strict',
    });

    // Set refresh token as HTTP-only cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      status_code: 200,
      response_code: '00',
      response_description: 'OTP verified and login successful',
      data: result,
    });
    return;
  }

  @Post('login/w/temp/pin')
  async loginWithTempLogin(
    @Body() loginWithhTempPinDto: LoginWithhTempPinDto,
    @Req() req: Request,
  ) {
    const client_ip = getClientIp(req);
    const token = await this.authService.loginWithTempPin(
      loginWithhTempPinDto,
      client_ip,
    );
    return { success: true, data: token };
  }

  @Post('validate/token')
  @AuditLogger('validateLoginToken')
  async validateLoginToken(
    @Body() validateTokenDto: ValidateTokenDto,
    @Req() req: Request,
  ) {
    const client_ip = getClientIp(req);
    const user_data = await this.authService.getUserAfterTokenVerify(
      validateTokenDto,
      client_ip,
    );

    return { success: true, data: user_data };
  }

  @Post('verify/email/later')
  async verifyEmailLater(@Body() verifyEmailLaterDto: VerifyEmailLaterDto) {
    const token = await this.authService.verifyEmailLater(verifyEmailLaterDto);
    return { success: true, data: token };
  }

  @Post('forgot/password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const reset = await this.authService.forgotPassword(forgotPasswordDto);
    console.log('reset', reset);
    // if (!reset) throw new NotImplementedException('Reset Request Failed');
    return { success: true, data: reset };
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP securely',
    description:
      'Resends a One-Time Password (OTP) to a registered email for authentication or password reset. Follows OWASP security best practices.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'User or OTP not found' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async resendOtp(@Body() body: ResendOtpDto, @Res() res: Response) {
    try {
      const { email } = body;
      const resp = await this.authService.resendOtp(email);
      res.status(201).json({
        success: true,
        status_code: 200,
        response_code: '00',
        response_description: 'OTP resent successfully',
        data: resp,
      });
      return;
    } catch (error) {
      // OWASP: avoid exposing sensitive internal error details
      throw new NotImplementedException(
        error?.message || 'Unable to process OTP request',
      );
    }
  }

  @Post('token/verify') // for reset password resquest
  async confirmForgotPasswordRequest(
    @Body() tokenVerifyActionDto: TokenVerifyActionDto,
  ) {
    const reset = await this.authService.tokenVerifyAction(
      tokenVerifyActionDto,
    );

    if (!reset) throw new NotImplementedException('Reset Confirmation Failed');
    return { success: true, data: reset };
  }

  @Post('/password/new/create')
  async createNewPassword(@Body() createNewPasswordDto: any) {
    const reset = await this.authService.createNewPassword(
      createNewPasswordDto,
    );

    if (!reset) throw new NotImplementedException('Reset Confirmation Failed');
    return { success: true, data: reset };
  }

  @Post('email/verify/confirm') // for verify email request
  async confirmEmailVerifyAction(@Body() verifyEmailDto: VerifyEmailDto) {
    const verify = await this.authService.confirmEmailVerifyAction(
      verifyEmailDto,
    );

    if (!verify)
      throw new NotImplementedException('Verify Confirmation Failed');

    return { success: true, data: verify };
  }

  @Post('generate-permanent-token')
  @ApiOperation({ summary: 'Generate permanent bearer token' })
  @ApiResponse({
    status: 200,
    description: 'Permanent token generated successfully',
  })
  @ApiResponse({ status: 401, description: 'User not authenticated' })
  async generatePermanentToken(@Req() req: Request) {
    const client_ip =
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress;

    // Get user from current session (assuming user is authenticated)
    const user = req['user'] as UserAccount;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const permanentToken = await this.authService.generatePermanentToken(
      user,
      client_ip as string,
    );

    return {
      success: true,
      data: permanentToken,
      message: 'Permanent token generated successfully',
    };
  }

  @Get('validate/phone/exist/:phone_number')
  async validatePhoneExist(@Param('phone_number') phone_number: string) {
    const phone_exists = await this.authService.validatePhoneExist(
      phone_number,
    );
    return { data: phone_exists };
  }

  @Get('heard/about/us')
  async howYouHeardAbtUs() {
    const hyhabt_us = Object.values(HowYouHeardAboutUs);
    return { success: true, data: hyhabt_us };
  }

  @Post('admin/cleanup-otps')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: 'all' })
  async forceCleanupOtps() {
    const result = await this.authService.forceCleanupOtps();
    return {
      success: true,
      data: result,
      message: `Cleanup completed: ${result.expired} expired and ${result.used} old used OTP records removed`,
    };
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() body: { refresh_token: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const client_ip = getClientIp(req);
    // Support getting token from body or cookie
    const token = body.refresh_token || req.cookies['refresh_token'];

    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.authService.refreshToken(token, client_ip);
    const { access_token, refresh_token } = result;

    // Set access token as HTTP-only cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
      sameSite: 'strict',
    });

    // Set new refresh token as HTTP-only cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      success: true,
      status_code: 200,
      response_code: '00',
      response_description: 'Tokens refreshed successfully',
      data: {
        token: access_token,
        refresh_token: refresh_token,
      },
    });
    return;
  }
}
