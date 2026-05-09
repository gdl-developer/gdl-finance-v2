import { WalletTypes } from './wallet.entity';

// Define the structure of a Wallet object for type safety
export interface WalletInt {
  wallet_type: string;
  [key: string]: any; // Allow for additional properties
}

// Define the structure of the sorted wallets array for type safety
export interface SortedWallets {
  wallet_type: WalletTypes;
  wallets: WalletInt[];
}
