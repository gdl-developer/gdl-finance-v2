import { createConnection } from 'typeorm';
import * as path from 'path';

// Load config dynamically to avoid import issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('../../ormconfig');

async function reset() {
  console.log('🔄 Connecting to database...');
  // Override entities path for script execution context
  const connection = await createConnection({
    ...config,
    entities: [path.join(__dirname, '../**/*.entity.ts')],
  });

  const queryRunner = connection.createQueryRunner();
  console.log('🗑️  Resetting wallet data...');

  try {
    // 1. Drop trigger (Unlock security)
    console.log('   - Dropping security trigger...');
    await queryRunner.query('DROP TRIGGER IF EXISTS prevent_balance_reduction');

    // 2. Clear transactions
    console.log('   - Truncating transactions...');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryRunner.query('TRUNCATE TABLE virtual_wallet_transaction');
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

    // 3. Reset wallets
    console.log('   - Resetting wallet totals...');
    await queryRunner.query(`
        UPDATE virtual_wallet
        SET total_credited = 0,
            total_debited = 0,
            current_balance = 0,
            last_transaction_date = NULL
     `);

    // 4. Restore trigger (Lock security)
    console.log('   - Restoring security trigger...');
    await queryRunner.query(`
            CREATE TRIGGER prevent_balance_reduction
            BEFORE UPDATE ON virtual_wallet
            FOR EACH ROW
            BEGIN
                IF NEW.total_credited < OLD.total_credited THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'total_credited cannot decrease';
                END IF;
                IF NEW.total_debited < OLD.total_debited THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'total_debited cannot decrease';
                END IF;
            END;
     `);

    console.log('✅ Reset complete. All balances are 0.');
  } catch (e) {
    console.error('❌ Error during reset:', e);
  } finally {
    await connection.close();
  }
}

reset();
