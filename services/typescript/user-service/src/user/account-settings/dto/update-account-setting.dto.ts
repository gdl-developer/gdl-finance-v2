import { ApiProperty } from '@nestjs/swagger';

export class UpdateAccountSettingDto {
  @ApiProperty()
  user_id?: number;

  @ApiProperty()
  settlement_account_number?: string;

  @ApiProperty()
  settlement_account_name?: string;

  @ApiProperty()
  settlement_bank_name?: string;
}
