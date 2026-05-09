const mysql = require('mysql');
const dotenv = require('dotenv');
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

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database.');

  const dropUpdateTrigger =
    'DROP TRIGGER IF EXISTS protect_transaction_history_update';
  const dropDeleteTrigger =
    'DROP TRIGGER IF EXISTS protect_transaction_history_delete';
  const truncateSql = 'TRUNCATE TABLE virtual_wallet_transaction';

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

  // Start sequential operations
  connection.query(dropUpdateTrigger, (err1) => {
    if (err1) console.error('Error dropping update trigger:', err1);

    connection.query(dropDeleteTrigger, (err2) => {
      if (err2) console.error('Error dropping delete trigger:', err2);

      console.log('🔓 Security triggers dropped.');

      connection.query(truncateSql, (err3, results) => {
        if (err3) {
          console.error('❌ Error truncating table:', err3);
        } else {
          console.log('✅ Transactions table truncated successfully.');
        }

        connection.query(restoreUpdateTrigger, (err4) => {
          if (err4) console.error('Error restoring update trigger:', err4);

          connection.query(restoreDeleteTrigger, (err5) => {
            if (err5) console.error('Error restoring delete trigger:', err5);

            console.log('🔒 Security triggers restored.');
            connection.end();
          });
        });
      });
    });
  });
});
