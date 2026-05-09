import { createConnection } from 'typeorm';
import * as path from 'path';

// Load ormconfig
let config;
try {
  config = require('../../ormconfig');
} catch (e) {
  try {
    config = require('../../dist/ormconfig');
  } catch (e2) {
    console.error('Could not find ormconfig');
    process.exit(1);
  }
}

async function listWallets() {
  console.log('🔄 Connecting to database...');
  try {
    const connection = await createConnection({
      ...config,
      entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
    });

    const queryRunner = connection.createQueryRunner();
    console.log('📋 Fetching virtual wallets...');

    const wallets = await queryRunner.query(
      'SELECT id, user_id, virtual_account_number, virtual_account_name, current_balance, status FROM virtual_wallet',
    );

    if (wallets && wallets.length > 0) {
      console.table(wallets);
    } else {
      console.log('No virtual wallets found.');
    }

    await connection.close();
  } catch (e) {
    console.error('❌ Error fetching wallets:', e);
  }
}

listWallets();
