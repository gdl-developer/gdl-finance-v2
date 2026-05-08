import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import {
  VirtualWalletStatus,
  VirtualWalletTransactionType,
} from '../entities/virtual-wallet.entity';
import { TransactionStatus } from '../entities/virtual-wallet-transaction.entity';

export class VirtualWalletResponseDto {
  id: number;
  user_id: number;
  virtual_account_number: string;
  virtual_account_name: string;
  bank_code: string;
  amount_control: string;
  current_balance: number;
  total_credited: number;
  total_debited: number;
  encrypted_infoware_customer_id: string;
  status: VirtualWalletStatus;
  response_code: string;
  response_message: string;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
}

export class UpdateVirtualWalletDto {
  @IsOptional()
  @IsNumber()
  current_balance?: number;

  @IsOptional()
  @IsNumber()
  total_credited?: number;

  @IsOptional()
  @IsNumber()
  total_debited?: number;

  @IsOptional()
  @IsEnum(VirtualWalletStatus)
  status?: VirtualWalletStatus;

  @IsOptional()
  @IsString()
  response_message?: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}

export class VirtualWalletTransactionDto {
  @IsString()
  transaction_reference: string;

  @IsOptional()
  @IsString()
  external_reference?: string;

  @IsEnum(VirtualWalletTransactionType)
  transaction_type: VirtualWalletTransactionType;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  sender_name?: string;

  @IsOptional()
  @IsString()
  sender_account?: string;

  @IsOptional()
  @IsString()
  sender_bank_code?: string;

  @IsOptional()
  @IsString()
  receiver_name?: string;

  @IsOptional()
  @IsString()
  receiver_account?: string;

  @IsOptional()
  @IsString()
  receiver_bank_code?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  response_code?: string;

  @IsOptional()
  @IsString()
  response_message?: string;

  @IsOptional()
  @IsString()
  metadata?: string;
}

export class VirtualWalletTransactionResponseDto {
  id: number;
  virtual_wallet_id: number;
  user_id: number;
  transaction_reference: string;
  external_reference?: string;
  transaction_type: VirtualWalletTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  sender_name?: string;
  sender_account?: string;
  sender_bank_code?: string;
  receiver_name?: string;
  receiver_account?: string;
  receiver_bank_code?: string;
  status: TransactionStatus;
  response_code: string;
  response_message?: string;
  metadata?: string;
  processed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class GetWalletTransactionsDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(VirtualWalletTransactionType)
  transaction_type?: VirtualWalletTransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsString()
  account_number?: string;
}
