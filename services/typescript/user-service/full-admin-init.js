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

async function init() {
  try {
    console.log('--- Initializing Full Admin Setup ---');

    // 1. Business Unit
    console.log('Setting up Business Unit (IT)...');
    await runQuery(`
      INSERT INTO business_unit (business_unit_name, description, created_by) 
      VALUES ('IT Department', 'Information Technology', 1)
      ON DUPLICATE KEY UPDATE business_unit_name=business_unit_name
    `);
    const bu = await runQuery(
      "SELECT id FROM business_unit WHERE business_unit_name = 'IT Department' LIMIT 1",
    );
    const buId = bu[0].id;

    // 2. Office Branch
    console.log('Setting up Office Branch (Lagos HQ)...');
    await runQuery(`
      INSERT INTO office_branch (branch_name, branch_code, created_by) 
      VALUES ('Lagos HQ', 'LAGOS', 1)
      ON DUPLICATE KEY UPDATE branch_name=branch_name
    `);
    const branch = await runQuery(
      "SELECT id FROM office_branch WHERE branch_name = 'Lagos HQ' LIMIT 1",
    );
    const branchId = branch[0].id;

    // 3. Admin Permissions
    console.log('Setting up Permissions...');
    const permissions = [
      'role:create',
      'role:edit',
      'role:list',
      'role:view',
      'role:delete',
      'admin:create',
      'admin:list',
      'permission:list',
    ];
    for (const p of permissions) {
      await runQuery(
        `
        INSERT INTO admin_permission (name, description) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE name=name
      `,
        [p, `Permission for ${p}`],
      );
    }
    const allPerms = await runQuery('SELECT id FROM admin_permission');

    // 4. Admin Role
    console.log('Setting up SUPER_ADMIN Role...');
    await runQuery(`
      INSERT INTO admin_role (name, description) 
      VALUES ('SUPER_ADMIN', 'Super Administrator')
      ON DUPLICATE KEY UPDATE name=name
    `);
    const role = await runQuery(
      "SELECT id FROM admin_role WHERE name = 'SUPER_ADMIN' LIMIT 1",
    );
    const roleId = role[0].id;

    // 5. Link Permissions to Role
    console.log('Linking Permissions to Role...');
    try {
      for (const p of allPerms) {
        // Try both possible join table names if first fails
        await runQuery(
          `
          INSERT IGNORE INTO admin_role_permissions_admin_permission (adminRoleId, adminPermissionId) 
          VALUES (?, ?)
        `,
          [roleId, p.id],
        ).catch((e) => {
          return runQuery(
            `
              INSERT IGNORE INTO admin_role_permissions_admin_permission (admin_role_id, admin_permission_id) 
              VALUES (?, ?)
            `,
            [roleId, p.id],
          );
        });
      }
    } catch (e) {
      console.log(
        'Warning: Could not link permissions (Join table might have different name).',
        e.message,
      );
    }

    // 6. Create Admin User
    console.log('Setting up Admin User (admin@Housemoni)...');
    const email = 'admin@Housemoni';
    const password = 'superadmin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    await runQuery(
      `
      INSERT INTO admin (
        staffFirstName, staffLastName, staffEmail, password, 
        activationStatus, user_type, account_status, roles_id, 
        business_unit_id, branch_id, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        roles_id = VALUES(roles_id),
        business_unit_id = VALUES(business_unit_id),
        branch_id = VALUES(branch_id),
        password = VALUES(password)
    `,
      [
        'Main',
        'Admin',
        email,
        hashedPassword,
        true,
        'SUPER_ADMIN',
        'ACTIVE',
        roleId,
        buId,
        branchId,
      ],
    );

    console.log('--- Full Admin Setup Finished Successfully ---');
  } catch (error) {
    console.error('Initialization failed:', error);
  } finally {
    connection.end();
  }
}

init();
