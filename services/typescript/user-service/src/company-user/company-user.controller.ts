import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CompanyUserService } from './company-user.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import {
  ResetPasswordDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  CreateNewPasswordDto,
} from './dto/reset-password.dto';
import { CompanyUserLoginDto } from './dto/login.dto';
import {
  SetTransactionPinDto,
  ValidateTransactionPinDto,
  ResetTransactionPinDto,
} from './dto/transaction-pin.dto';
import { CompanyUser } from './entities/company-user.entity';

@ApiTags('CompanyUsers')
@Controller('company-users')
export class CompanyUserController {
  constructor(private readonly companyUserService: CompanyUserService) {}

  // @Post()
  // @ApiOperation({ summary: 'Create new company user' })
  // @ApiResponse({ status: 201, description: 'Company user created successfully' })
  // async create(@Body() createCompanyUserDto: CreateCompanyUserDto): Promise<CompanyUser> {
  //   return this.companyUserService.create(createCompanyUserDto);
  // }

  @Get()
  @ApiOperation({ summary: 'Get all company users' })
  @ApiResponse({
    status: 200,
    description: 'Company users retrieved successfully',
  })
  async findAll(
    @Query('companyId') companyId?: string,
  ): Promise<CompanyUser[]> {
    return this.companyUserService.findAll(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Company user retrieved successfully',
  })
  async findOne(@Param('id') id: string): Promise<CompanyUser> {
    return this.companyUserService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company user' })
  @ApiResponse({
    status: 200,
    description: 'Company user updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCompanyUserDto: UpdateCompanyUserDto,
  ): Promise<CompanyUser> {
    return this.companyUserService.update(id, updateCompanyUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company user' })
  @ApiResponse({
    status: 204,
    description: 'Company user deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.companyUserService.remove(id);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login company user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body() loginDto: CompanyUserLoginDto,
    @Query('clientIp') clientIp: string,
  ) {
    return this.companyUserService.login(loginDto, clientIp || '127.0.0.1');
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify company user email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.companyUserService.verifyEmail(verifyOtpDto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Forgot password request' })
  @ApiResponse({
    status: 200,
    description: 'Forgot password request processed',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.companyUserService.forgotPassword(forgotPasswordDto);
  }

  @Post('create-new-password')
  @ApiOperation({ summary: 'Create new password' })
  @ApiResponse({
    status: 200,
    description: 'New password created successfully',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  async createNewPassword(@Body() createNewPasswordDto: CreateNewPasswordDto) {
    return this.companyUserService.createNewPassword(createNewPasswordDto);
  }

  @Patch('reset-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Query('userId') userId: string,
  ) {
    return this.companyUserService.resetPassword(resetPasswordDto, userId);
  }

  @Patch('set-transaction-pin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Set transaction PIN' })
  @ApiResponse({ status: 200, description: 'Transaction PIN set successfully' })
  async setTransactionPin(
    @Body() setTransactionPinDto: SetTransactionPinDto,
    @Query('userId') userId: string,
  ) {
    return this.companyUserService.setTransactionPin(
      setTransactionPinDto,
      userId,
    );
  }

  @Post('validate-transaction-pin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate transaction PIN' })
  @ApiResponse({
    status: 200,
    description: 'Transaction PIN validated successfully',
  })
  async validateTransactionPin(
    @Body() validatePinDto: ValidateTransactionPinDto,
    @Query('userId') userId: string,
  ) {
    return this.companyUserService.validateTransactionPin(
      validatePinDto,
      userId,
    );
  }

  @Patch('reset-transaction-pin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reset transaction PIN' })
  @ApiResponse({
    status: 200,
    description: 'Transaction PIN reset successfully',
  })
  async resetTransactionPin(
    @Body() resetPinDto: ResetTransactionPinDto,
    @Query('userId') userId: string,
  ) {
    return this.companyUserService.resetTransactionPin(resetPinDto, userId);
  }
}
