import { Type } from 'class-transformer';
import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { VirtualWalletTransactionType } from '../entities/virtual-wallet.entity';
import { TransactionStatus } from '../entities/virtual-wallet-transaction.entity';

export class GetWalletTransactionsDTO {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit = 20;

  @IsOptional()
  @IsEnum(VirtualWalletTransactionType)
  transaction_type?: VirtualWalletTransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  account_number?: string;
}
