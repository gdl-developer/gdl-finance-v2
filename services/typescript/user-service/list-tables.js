const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({ path: './User-Service/.env' });

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

connection.connect();

connection.query('SHOW TABLES', (error, results) => {
  if (error) {
    console.error('Error listing tables:', error);
  } else {
    console.log('--- Tables in ' + process.env.DB_NAME + ' ---');
    console.log(JSON.stringify(results, null, 2));
  }
  connection.end();
});
