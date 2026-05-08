const mysql = require('mysql');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

const walletsBackupPath = path.join(
  __dirname,
  'backup/virtual_wallets_backup_2026-04-15T16-04-09-820Z.json',
);
const transactionsBackupPath = path.join(
  __dirname,
  'backup/virtual_transactions_backup_2026-04-15T16-11-18-083Z.json',
);

const walletsBackup = JSON.parse(fs.readFileSync(walletsBackupPath, 'utf8'));
const transactionsBackup = JSON.parse(
  fs.readFileSync(transactionsBackupPath, 'utf8'),
);

// Target Wallet IDs (Created >= April 1st, 2026)
const aprilWalletIds = [13, 14, 15, 16];

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database.');

  async function execute() {
    try {
      // 1. Delete pre-April wallets
      console.log('🗑️ Deleting pre-April wallets...');
      const preAprilIds = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      await new Promise((resolve, reject) => {
        connection.query(
          'DELETE FROM virtual_wallet WHERE id IN (?)',
          [preAprilIds],
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });
      console.log('   - Deleted IDs:', preAprilIds.join(', '));

      // 2. Restore account numbers for April+ wallets
      console.log('🔄 Restoring account numbers for April+ wallets...');
      for (const id of aprilWalletIds) {
        const walletData = walletsBackup.find((w) => w.id === id);
        if (walletData) {
          await new Promise((resolve, reject) => {
            connection.query(
              'UPDATE virtual_wallet SET virtual_account_number = ? WHERE id = ?',
              [walletData.virtual_account_number, id],
              (err) => {
                if (err) reject(err);
                else resolve();
              },
            );
          });
          console.log(
            `   - Restored ID ${id}: ${walletData.virtual_account_number}`,
          );
        }
      }

      // 3. Restore transaction history for April+ wallets
      console.log('📜 Restoring transaction history for April+ wallets...');

      // Filter transactions
      const filteredTransactions = transactionsBackup.filter((tx) =>
        aprilWalletIds.includes(tx.virtual_wallet_id),
      );
      console.log(
        `   - Found ${filteredTransactions.length} transactions to restore.`,
      );

      if (filteredTransactions.length > 0) {
        // Drop triggers
        await new Promise((res) =>
          connection.query(
            'DROP TRIGGER IF EXISTS protect_transaction_history_delete',
            res,
          ),
        );
        await new Promise((res) =>
          connection.query(
            'DROP TRIGGER IF EXISTS protect_transaction_history_update',
            res,
          ),
        );
        console.log('   - Security triggers dropped.');

        // Insert transactions
        for (const tx of filteredTransactions) {
          // Flatten transaction object for SQL insertion and format dates
          const keys = Object.keys(tx);
          const values = Object.entries(tx).map(([key, val]) => {
            if (
              ['created_at', 'updated_at', 'processed_at'].includes(key) &&
              val
            ) {
              // Convert ISO 8601 to MySQL format: YYYY-MM-DD HH:MM:SS
              return new Date(val).toISOString().slice(0, 19).replace('T', ' ');
            }
            return val instanceof Object ? JSON.stringify(val) : val;
          });

          const placeholders = keys.map(() => '?').join(', ');

          await new Promise((resolve, reject) => {
            connection.query(
              `INSERT INTO virtual_wallet_transaction (${keys.join(', ')}) VALUES (${placeholders})`,
              values,
              (err) => {
                if (err) {
                  console.error(
                    `Error inserting transaction ID ${tx.id}:`,
                    err,
                  );
                  reject(err);
                } else resolve();
              },
            );
          });
        }
        console.log(
          `   - Successfully restored ${filteredTransactions.length} transactions.`,
        );

        // Restore triggers
        const restoreUpdateTrigger = `
          CREATE TRIGGER protect_transaction_history_update 
          BEFORE UPDATE ON virtual_wallet_transaction 
          FOR EACH ROW 
          BEGIN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be updated';
          END
        `;
        const restoreDeleteTrigger = `
          CREATE TRIGGER protect_transaction_history_delete 
          BEFORE DELETE ON virtual_wallet_transaction 
          FOR EACH ROW 
          BEGIN
              SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be deleted';
          END
        `;
        await new Promise((resolve, reject) => {
          connection.query(restoreUpdateTrigger, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        await new Promise((resolve, reject) => {
          connection.query(restoreDeleteTrigger, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('   - Security triggers restored.');
      }

      console.log('✅ Selective restoration complete.');
    } catch (e) {
      console.error('❌ Error during restoration:', e);
    } finally {
      connection.end();
    }
  }

  execute();
});
