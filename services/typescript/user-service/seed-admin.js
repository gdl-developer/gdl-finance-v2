const mysql = require('mysql');
const bcrypt = require('bcryptjs');
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

async function seed() {
  try {
    console.log('--- Seeding Super Admin ---');

    // 1. Create Role
    const roleName = 'SUPER_ADMIN';
    const roleId = await new Promise((resolve, reject) => {
      connection.query(
        'SELECT id FROM admin_role WHERE name = ? LIMIT 1',
        [roleName],
        (err, res) => {
          if (err) reject(err);
          else if (res.length > 0) resolve(res[0].id);
          else {
            connection.query(
              'INSERT INTO admin_role (name, description, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())',
              [roleName, 'Super Administrator with full system access'],
              (err, res) => {
                if (err) reject(err);
                else resolve(res.insertId);
              },
            );
          }
        },
      );
    });
    console.log('Role ID:', roleId);

    // 2. Create Admin
    const email = 'superadmin@Housemoni';
    const password = 'SuperAdmin@123';
    const hashedPassword = await bcrypt.hash(password, 12);

    await new Promise((resolve, reject) => {
      connection.query(
        'SELECT staffId FROM admin WHERE staffEmail = ?',
        [email],
        (err, res) => {
          if (err) reject(err);
          else if (res.length > 0) {
            console.log('Admin already exists.');
            resolve();
          } else {
            const sql = `INSERT INTO admin (
            staffFirstName, staffLastName, staffEmail, password, 
            activationStatus, user_type, account_status, roles_id, 
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
            connection.query(
              sql,
              [
                'Super',
                'Admin',
                email,
                hashedPassword,
                true,
                'SUPER_ADMIN',
                'ACTIVE',
                roleId,
              ],
              (err, res) => {
                if (err) reject(err);
                else {
                  console.log('Super Admin seeded successfully!');
                  resolve();
                }
              },
            );
          }
        },
      );
    });
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    connection.end();
  }
}

seed();
