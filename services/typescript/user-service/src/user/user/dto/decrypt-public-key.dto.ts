import { IsString } from 'class-validator';

export class DecryptPublicKeyDto {
  @IsString()
  publicKey: string;
}
