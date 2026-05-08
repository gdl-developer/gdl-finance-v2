import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { CompanyUser } from './entities/company-user.entity';

@Injectable()
export class TwoFactorAuthenticationService {
  constructor(
    @InjectRepository(CompanyUser)
    private readonly companyUserRepository: Repository<CompanyUser>,
  ) {}

  async generateTwoFactorSecret(
    email: string,
  ): Promise<{ secret: string; otpauthUrl: string; qrCodeDataURL: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'CompanyUserApp', secret);
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataURL,
    };
  }

  async enableTwoFactorAuthentication(userId: string, secret: string) {
    const user = await this.companyUserRepository.findOne({
      where: { id: userId },
    });
    user.twoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await this.companyUserRepository.save(user);
  }

  async verifyTwoFactorToken(userId: string, token: string): Promise<boolean> {
    const user = await this.companyUserRepository.findOne({
      where: { id: userId },
    });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }
    return authenticator.verify({ token, secret: user.twoFactorSecret });
  }

  async disableTwoFactorAuthentication(userId: string) {
    const user = await this.companyUserRepository.findOne({
      where: { id: userId },
    });
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.companyUserRepository.save(user);
  }
}
