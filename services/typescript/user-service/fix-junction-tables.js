const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({ path: './User-Service/.env' });

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

connection.connect();

async function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function fix() {
  try {
    console.log('--- Fixing Junction Tables ---');

    // 1. Create admin_role_permissions_admin_permission
    console.log('Creating admin_role_permissions_admin_permission...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS admin_role_permissions_admin_permission (
        adminRoleId int(11) NOT NULL,
        adminPermissionId int(11) NOT NULL,
        PRIMARY KEY (adminRoleId, adminPermissionId),
        KEY IDX_role (adminRoleId),
        KEY IDX_perm (adminPermissionId)
      ) ENGINE=InnoDB;
    `);

    // 2. Create admin_roles_admin_role
    console.log('Creating admin_roles_admin_role...');
    await runQuery(`
      CREATE TABLE IF NOT EXISTS admin_roles_admin_role (
        adminStaffId int(11) NOT NULL,
        adminRoleId int(11) NOT NULL,
        PRIMARY KEY (adminStaffId, adminRoleId),
        KEY IDX_staff (adminStaffId),
        KEY IDX_role (adminRoleId)
      ) ENGINE=InnoDB;
    `);

    // 3. Re-link the Super Admin
    console.log('Linking admin@Housemoni to SUPER_ADMIN role...');
    const admin = await runQuery(
      "SELECT staffId FROM admin WHERE staffEmail = 'admin@Housemoni' LIMIT 1",
    );
    const role = await runQuery(
      "SELECT id FROM admin_role WHERE name = 'SUPER_ADMIN' LIMIT 1",
    );

    if (admin.length > 0 && role.length > 0) {
      const staffId = admin[0].staffId;
      const roleId = role[0].id;

      await runQuery(
        'INSERT IGNORE INTO admin_roles_admin_role (adminStaffId, adminRoleId) VALUES (?, ?)',
        [staffId, roleId],
      );

      // 4. Link all permissions to the SUPER_ADMIN role
      console.log('Linking all permissions to SUPER_ADMIN role...');
      const perms = await runQuery('SELECT id FROM admin_permission');
      for (const p of perms) {
        await runQuery(
          'INSERT IGNORE INTO admin_role_permissions_admin_permission (adminRoleId, adminPermissionId) VALUES (?, ?)',
          [roleId, p.id],
        );
      }
      console.log(`Linked ${perms.length} permissions.`);
    } else {
      console.error(
        'Error: admin@Housemoni or SUPER_ADMIN role missing. Please run full-admin-init.js first.',
      );
    }

    console.log('--- Junction Tables Fixed Successfully ---');
  } catch (error) {
    console.error('Fix failed:', error.message);
  } finally {
    connection.end();
  }
}

fix();
