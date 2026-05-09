import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  NotAcceptableException,
  Post,
  NotImplementedException,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchUsersDto } from './dto/serach-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpgreadeUserKYCDto } from './dto/upgrade-user-kyc.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import {
  GenderTypes,
  MaritalStatuses,
  UserAccount,
} from './entities/user.entity';
import { UserService } from './user.service';
import { AuditLogger } from 'src/common/audit-logger/utils/audit-log.decorator';
import { ResetTxnPinDto } from '../auth/dto/reset-txn-pin.dto';
import { PasswordResetDto } from '../auth/dto/reset-password.dto';
import { Action } from 'src/common/casl-ability-rbac/ability.factory';
import { CheckAbilities } from 'src/common/casl-ability-rbac/abilities.decorator';
import { AbilitiesGuard } from 'src/common/casl-ability-rbac/abilities.guard';
import { getClientIp } from 'request-ip';
import { Request } from 'express';
import { Update2FAStatusDto } from './dto/update-2fa-status.dto';
import { UpdateDto } from './dto/update.dto';
import { DecryptPublicKeyDto } from './dto/decrypt-public-key.dto';

@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /* -------------------------------------------------------------------------- */
  /*                               USER ENDPOINTS                              */
  /* -------------------------------------------------------------------------- */

  @Get()
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  @AuditLogger('GetAllUsers1')
  async getAllUsers() {
    const users = await this.userService.findAllOld();
    return { data: users };
  }

  @Get('all')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.ReadAll, subject: UserAccount })
  @AuditLogger('GetAllUsers2')
  async findAllUsers(@Query() searchUsersDto: SearchUsersDto) {
    const { page, per_page, ...query } = searchUsersDto;
    const users = await this.userService.findAllUsers(page, per_page, query);
    return { data: users };
  }

  @Get(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Read, subject: UserAccount })
  @AuditLogger('GetUser')
  async findOne(@Param('id') id: string) {
    const user = await this.userService.findOneUser(+id);
    return { data: user };
  }

  @Patch(':id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: UserAccount })
  @AuditLogger('UpdateUser')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const { user_id, ...others } = updateUserDto;
    const user = await this.userService.findOne({ id: user_id });

    if (user.id != +id)
      throw new NotAcceptableException(
        'Attempting to update the wrong user record',
      );

    const updated = await this.userService.update(user_id, { ...others });
    return { data: updated };
  }

  @Patch('upgrade/kyc')
  @AuditLogger('UpgradeUserKyc')
  async upgradeUserKyc(@Body() upgreadeUserKYCDto: UpgreadeUserKYCDto) {
    const u_kyc = await this.userService.upgradeUserKYC(upgreadeUserKYCDto);
    return { data: u_kyc };
  }

  @Get('approve/docs/:user_id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Manage, subject: UserAccount })
  @AuditLogger('ApproveUserDocs')
  async approveUserDocs(@Param('user_id') user_id: number) {
    const u_kyc = await this.userService.approveUserDocs(user_id);
    return { data: u_kyc };
  }

  @Post()
  @AuditLogger('CreateUserWallet')
  async createUserWallet(@Body() user_id: number, @Req() req: Request) {
    const client_ip = getClientIp(req);
    const user = await this.userService.findOne({ user_id });
    const wallet = await this.userService.createUserWallet(user, client_ip);
    return { data: wallet };
  }

  @Get('marital/statuses')
  @AuditLogger('FetchMaritalStatuses')
  async maritalStatus() {
    return { data: Object.values(MaritalStatuses) };
  }

  @Get('gender/types')
  @AuditLogger('FetchGenderTypes')
  async gender() {
    return { data: Object.values(GenderTypes) };
  }

  @Post('set/account-status/active')
  async activateAccount(@Body() dto: UpdateDto) {
    const resp = await this.userService.updateAccountStatusToActive(dto.email);
    return { success: true, data: resp };
  }

  @Patch('set/2fa')
  async toggle2FA(@Body() dto: Update2FAStatusDto) {
    const resp = await this.userService.update2FAStatus(dto.email, dto);
    return { success: true, data: resp };
  }

  @Patch('txn/pin/reset')
  @AuditLogger('ResetTxnPin')
  async resetTxnPin(@Body() resetTxnPinDto: ResetTxnPinDto) {
    const reset = await this.userService.resetTxnPin(resetTxnPinDto);
    if (!reset) throw new NotImplementedException('Reset Request Failed');
    return { success: true, data: reset };
  }

  @Post('password/reset')
  @AuditLogger('ResetPassword')
  async resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    const reset = await this.userService.resetPassword(passwordResetDto);
    if (!reset) throw new NotImplementedException('Reset Request Failed');
    return { success: true, data: reset };
  }

  /* -------------------------------------------------------------------------- */
  /*                          AWS S3 SIGNED URL ENDPOINTS                       */
  /* -------------------------------------------------------------------------- */
  @Post('s3/upload-url')
  @AuditLogger('GenerateS3UploadUrl')
  async generateS3UploadUrl(
    @Req() request: Request,
    @Body() body: { fileName: string; contentType: string },
  ) {
    // Make sure user info exists
    const whoAmmI = request['whoAmmI'];
    if (!whoAmmI || !whoAmmI.user_id) {
      throw new NotAcceptableException('Unauthorized Request');
    }

    const { user_id } = whoAmmI;
    const { fileName, contentType } = body;

    if (!fileName || !contentType)
      throw new NotAcceptableException('File name and content type required');

    const user = await this.userService.findUserById(user_id);
    if (!user) throw new NotImplementedException('User not found');

    const result = await this.userService.generateS3UploadUrl(
      user,
      fileName,
      contentType,
    );

    return { success: true, data: result };
  }

  @Get('s3/download-url')
  @AuditLogger('GenerateS3DownloadUrl')
  async generateS3DownloadUrl(
    @Req() request: Request,
    @Query('key') key: string,
  ) {
    const whoAmmI = request['whoAmmI'];
    if (!whoAmmI || !whoAmmI.user_id) {
      throw new NotAcceptableException('Unauthorized Request');
    }

    const { user_id } = whoAmmI;
    if (!key) throw new NotAcceptableException('File key is required');

    const user = await this.userService.findUserById(user_id);
    if (!user) throw new NotImplementedException('User not found');

    const result = await this.userService.generateS3DownloadUrl(user, key);
    return { success: true, data: result };
  }

  @Post('decrypt/public-key')
  @AuditLogger('DecryptPublicKey')
  async decryptPublicKey(@Body('publicKey') publicKey: string) {
    if (!publicKey) throw new NotAcceptableException('publicKey is required');

    const decrypted = this.userService.decryptPublicKey(publicKey);

    return { success: true, data: { decrypted } };
  }

  @Get('export-data')
  @AuditLogger('ExportUserData')
  async exportData(@Req() request: Request) {
    const whoAmmI = request['whoAmmI'];
    if (!whoAmmI || !whoAmmI.user_id) {
      throw new NotAcceptableException('Unauthorized Request');
    }
    const result = await this.userService.exportUserData(whoAmmI.user_id);
    return { success: true, data: result };
  }

  @Delete('account')
  @AuditLogger('DeleteAccount')
  async deleteAccount(@Req() request: Request) {
    const whoAmmI = request['whoAmmI'];
    if (!whoAmmI || !whoAmmI.user_id) {
      throw new NotAcceptableException('Unauthorized Request');
    }
    return this.userService.deleteUserAccount(whoAmmI.user_id);
  }

  @Delete('account/:id')
  @UseGuards(AbilitiesGuard)
  @CheckAbilities({ action: Action.Delete, subject: UserAccount })
  @AuditLogger('AdminDeleteAccount')
  async adminDeleteAccount(@Param('id') id: string) {
    return this.userService.deleteUserAccount(+id);
  }

  @Patch('consent')
  @AuditLogger('UpdateConsent')
  async updateConsent(@Req() request: Request, @Body() dto: UpdateConsentDto) {
    const whoAmmI = request['whoAmmI'];
    if (!whoAmmI || !whoAmmI.user_id) {
      throw new NotAcceptableException('Unauthorized Request');
    }
    return this.userService.updateConsent(whoAmmI.user_id, {
      ...dto,
      user_agent: request.headers['user-agent'],
      ip_address: request.ip,
    });
  }
}
