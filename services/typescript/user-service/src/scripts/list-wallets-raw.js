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

  const sql = `
    SELECT 
      vw.id, 
      vw.user_id, 
      ua.first_name, 
      ua.last_name, 
      vw.virtual_account_number, 
      vw.virtual_account_name, 
      vw.current_balance, 
      vw.status 
    FROM virtual_wallet vw
    LEFT JOIN user_account ua ON vw.user_id = ua.id
    LIMIT 100
  `;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('❌ Error executing query:', error);
    } else {
      console.log('📋 Virtual Wallets:');
      console.table(results);
    }
    connection.end();
  });
});
