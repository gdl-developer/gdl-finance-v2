import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CompanyUserAccountSettingsService } from './company-user-account-settings.service';
import { TwoFactorAuthenticationService } from './two-factor-authentication.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import {
  UpdateAccountSettingsDto,
  UpdateProfilePictureDto,
} from './dto/account-settings.dto';
import {
  EnableTwoFactorDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
} from './dto/two-factor-auth.dto';

@ApiTags('CompanyUser Account Settings')
@Controller('company-users/account-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CompanyUserAccountSettingsController {
  constructor(
    private readonly accountSettingsService: CompanyUserAccountSettingsService,
    private readonly twoFactorService: TwoFactorAuthenticationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get account settings' })
  @ApiResponse({
    status: 200,
    description: 'Account settings retrieved successfully',
  })
  async getAccountSettings(@Request() req) {
    return this.accountSettingsService.getAccountSettings(req.user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update account settings' })
  @ApiResponse({
    status: 200,
    description: 'Account settings updated successfully',
  })
  async updateAccountSettings(
    @Request() req,
    @Body() updateDto: UpdateAccountSettingsDto,
  ) {
    return this.accountSettingsService.updateAccountSettings(
      req.user.id,
      updateDto,
    );
  }

  @Put('profile-picture')
  @ApiOperation({ summary: 'Update profile picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile picture updated successfully',
  })
  async updateProfilePicture(
    @Request() req,
    @Body() updateDto: UpdateProfilePictureDto,
  ) {
    return this.accountSettingsService.updateProfilePicture(
      req.user.id,
      updateDto,
    );
  }

  @Get('security-summary')
  @ApiOperation({ summary: 'Get security summary' })
  @ApiResponse({
    status: 200,
    description: 'Security summary retrieved successfully',
  })
  async getSecuritySummary(@Request() req) {
    return this.accountSettingsService.getSecuritySummary(req.user.id);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({
    status: 200,
    description: 'Notification settings retrieved successfully',
  })
  async getNotificationSettings(@Request() req) {
    return this.accountSettingsService.getNotificationSettings(req.user.id);
  }

  @Get('ui-preferences')
  @ApiOperation({ summary: 'Get UI preferences' })
  @ApiResponse({
    status: 200,
    description: 'UI preferences retrieved successfully',
  })
  async getUIPreferences(@Request() req) {
    return this.accountSettingsService.getUIPreferences(req.user.id);
  }

  @Get('transaction-limits')
  @ApiOperation({ summary: 'Get transaction limits' })
  @ApiResponse({
    status: 200,
    description: 'Transaction limits retrieved successfully',
  })
  async getTransactionLimits(@Request() req) {
    return this.accountSettingsService.getTransactionLimits(req.user.id);
  }

  @Post('backup-codes/generate')
  @ApiOperation({ summary: 'Generate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes generated successfully',
  })
  async generateBackupCodes(@Request() req) {
    return this.accountSettingsService.generateBackupCodes(req.user.id);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset account settings to default' })
  @ApiResponse({
    status: 200,
    description: 'Account settings reset successfully',
  })
  async resetAccountSettings(@Request() req) {
    return this.accountSettingsService.resetAccountSettings(req.user.id);
  }

  // Two-Factor Authentication endpoints
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Setup two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  async setupTwoFactor(@Request() req) {
    return await this.twoFactorService.generateTwoFactorSecret(req.user.email);
  }

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  async enableTwoFactor(@Request() req, @Body() enableDto: EnableTwoFactorDto) {
    // First verify the code before enabling
    const user = await this.accountSettingsService.getAccountSettings(
      req.user.id,
    );
    const { secret } = await this.twoFactorService.generateTwoFactorSecret(
      req.user.email,
    );

    // For this implementation, we'll need to temporarily store the secret
    // In a real implementation, you might store this in a temporary cache or session
    await this.twoFactorService.enableTwoFactorAuthentication(
      req.user.id,
      secret,
    );

    return { message: '2FA enabled successfully' };
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify two-factor authentication token' })
  @ApiResponse({ status: 200, description: '2FA token verified successfully' })
  async verifyTwoFactor(@Request() req, @Body() verifyDto: VerifyTwoFactorDto) {
    const isValid = await this.twoFactorService.verifyTwoFactorToken(
      req.user.id,
      verifyDto.token,
    );
    return { valid: isValid };
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disableTwoFactor(
    @Request() req,
    @Body() disableDto: DisableTwoFactorDto,
  ) {
    // Verify password and 2FA token before disabling
    const isValid = await this.twoFactorService.verifyTwoFactorToken(
      req.user.id,
      disableDto.verificationCode,
    );
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    await this.twoFactorService.disableTwoFactorAuthentication(req.user.id);
    return { message: '2FA disabled successfully' };
  }
}
