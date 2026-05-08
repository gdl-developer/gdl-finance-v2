const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({ path: './User-Service/.env' });

function attemptFetch(retries = 3) {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  console.log(
    `Attempting connection to ${process.env.DB_HOST}... (Retries left: ${retries})`,
  );

  connection.connect((err) => {
    if (err) {
      console.error('Connection failed:', err.message);
      connection.destroy();
      if (retries > 0) {
        setTimeout(() => attemptFetch(retries - 1), 5000);
      } else {
        console.error('Final attempt failed.');
      }
      return;
    }

    console.log('Connected! Fetching admin users...');
    connection.query(
      'SELECT staffId, staffFirstName, staffLastName, staffEmail, user_type, account_status FROM admin',
      (error, results) => {
        if (error) {
          console.error('Error fetching admin:', error);
        } else {
          console.log('--- Admin Users List ---');
          console.table(results);
        }
        connection.end();
      },
    );
  });
}

attemptFetch();
