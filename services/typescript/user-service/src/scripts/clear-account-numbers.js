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

  const alterSql =
    'ALTER TABLE virtual_wallet MODIFY virtual_account_number VARCHAR(20) NULL';
  const updateSql = 'UPDATE virtual_wallet SET virtual_account_number = NULL';

  connection.query(alterSql, (alterErr) => {
    if (alterErr) {
      console.error('❌ Error altering table:', alterErr);
      connection.end();
      return;
    }
    console.log('✅ Table altered successfully (nullable: YES).');

    connection.query(updateSql, (updateErr, results) => {
      if (updateErr) {
        console.error('❌ Error updating records:', updateErr);
      } else {
        console.log(
          `✅ ${results.affectedRows} records updated. Account numbers cleared.`,
        );
      }
      connection.end();
    });
  });
});
