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

  const sql = 'DESCRIBE virtual_wallet';

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('❌ Error executing query:', error);
    } else {
      console.log('📋 Column Metadata:');
      console.table(results);
    }
    connection.end();
  });
});
