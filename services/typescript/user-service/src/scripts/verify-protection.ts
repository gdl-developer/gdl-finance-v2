import { createConnection, getConnectionOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { VirtualWallet } from '../user/virtual-account/entities/virtual-wallet.entity';
import { VirtualWalletTransaction } from '../user/virtual-account/entities/virtual-wallet-transaction.entity';

// Load env
dotenv.config();

async function runVerification() {
  try {
    // Use older TypeORM connection method
    const connection = await createConnection({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [VirtualWallet, VirtualWalletTransaction],
      synchronize: false,
    });

    console.log('✅ Connected to Database');

    // 1. Get a test wallet
    const wallet = await connection.manager.findOne(VirtualWallet, {
      order: { id: 'ASC' },
    });
    if (!wallet) {
      console.log('❌ No wallet found to test');
      return;
    }

    console.log(`\n--- TESTING WALLET: ${wallet.virtual_account_number} ---`);
    console.log(
      `Initial State: Balance=${wallet.current_balance}, Credited=${wallet.total_credited}, Debited=${wallet.total_debited}`,
    );

    // --- TEST 1: Direct Message Tampering ---
    console.log(
      `\n[ATTACK 1] Attempting to manually overwrite 'current_balance' to 9,000,000...`,
    );
    await connection.query(
      `UPDATE virtual_wallet SET current_balance = 9000000 WHERE id = ?`,
      [wallet.id],
    );

    // Check result
    const walletAfterTamper = await connection.manager.findOne(VirtualWallet, {
      where: { id: wallet.id },
    });
    if (Number(walletAfterTamper.current_balance) === 9000000) {
      console.log(`❌ VULNERABLE: Direct update succeeded!`);
    } else {
      console.log(
        `✅ BLOCKED: Balance is ${walletAfterTamper.current_balance} (The trigger reverted your change!)`,
      );
    }

    // --- TEST 2: Decreasing Totals (Reverse Engineering) ---
    console.log(
      `\n[ATTACK 2] Attempting to decrease 'total_credited' (to hide income)...`,
    );
    try {
      await connection.query(
        `UPDATE virtual_wallet SET total_credited = total_credited - 1 WHERE id = ?`,
        [wallet.id],
      );
      console.log(`❌ VULNERABLE: Decrease succeeded!`);
    } catch (e) {
      console.log(
        `✅ BLOCKED: Database rejected the update. Error: ${e.message}`,
      );
    }

    // --- TEST 3: Deleting Transaction History ---
    console.log(`\n[ATTACK 3] Attempting to DELETE all transaction history...`);
    try {
      await connection.query(
        `DELETE FROM virtual_wallet_transaction WHERE virtual_wallet_id = ?`,
        [wallet.id],
      );
      console.log(`❌ VULNERABLE: Delete succeeded!`);
    } catch (e) {
      console.log(
        `✅ BLOCKED: Database rejected the delete. Error: ${e.message}`,
      );
    }

    await connection.close();
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

runVerification();
