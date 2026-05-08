// src/device/dto/create-device.dto.ts
import { IsString, IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  browserName: string;

  @IsString()
  userAgent: string;

  @IsString()
  os: string;

  @IsString()
  platform: string;

  @IsString()
  deviceHash: string;

  @IsUUID()
  userId: string; // ✅ required, UUID string
}
