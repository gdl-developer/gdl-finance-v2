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

const backupDir = path.join(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(
  backupDir,
  `virtual_wallets_backup_${timestamp}.json`,
);

connection.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database.');

  const sql = 'SELECT id, user_id, virtual_account_number FROM virtual_wallet';

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('❌ Error executing query:', error);
    } else {
      fs.writeFileSync(backupFile, JSON.stringify(results, null, 2));
      console.log(`✅ Backup successfully saved to ${backupFile}`);
      console.log(`📊 Number of records backed up: ${results.length}`);
    }
    connection.end();
  });
});
