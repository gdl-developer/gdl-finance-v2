import { Controller, Get } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Controller('auth/encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Get('public-key')
  getPublicKey() {
    return {
      success: true,
      public_key: this.encryptionService.getPublicKey(),
    };
  }
}
