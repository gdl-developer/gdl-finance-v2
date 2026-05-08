import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedSuperAdmin1733158472022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create Super Admin role if it doesn't exist
    const roleExists = await queryRunner.query(
      `SELECT id FROM admin_role WHERE name = 'SUPER_ADMIN' LIMIT 1`,
    );

    let roleId: number;

    if (roleExists.length === 0) {
      await queryRunner.query(
        `INSERT INTO admin_role (name, description, createdAt, updatedAt) 
         VALUES ('SUPER_ADMIN', 'Super Administrator with full system access', NOW(), NOW())`,
      );

      const [newRole] = await queryRunner.query(
        `SELECT id FROM admin_role WHERE name = 'SUPER_ADMIN' LIMIT 1`,
      );
      roleId = newRole.id;
    } else {
      roleId = roleExists[0].id;
    }

    // Step 2: Check if super admin already exists
    const adminExists = await queryRunner.query(
      `SELECT staffId FROM admin WHERE staffEmail = 'superadmin@Housemoni' LIMIT 1`,
    );

    if (adminExists.length === 0) {
      // Step 3: Hash the default password
      const defaultPassword = 'SuperAdmin@123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);

      // Step 4: Insert super admin user
      await queryRunner.query(
        `INSERT INTO admin (
          staffFirstName, 
          staffLastName, 
          staffEmail, 
          password, 
          activationStatus, 
          user_type, 
          account_status, 
          roles_id,
          createdAt, 
          updatedAt
        ) VALUES (
          'Super', 
          'Admin', 
          'superadmin@Housemoni', 
          ?, 
          true, 
          'SUPER_ADMIN', 
          'ACTIVE', 
          ?,
          NOW(), 
          NOW()
        )`,
        [hashedPassword, roleId],
      );

      console.log('✅ Super Admin created successfully');
      console.log('📧 Email: superadmin@Housemoni');
      console.log('🔑 Password: SuperAdmin@123');
      console.log(
        '⚠️  IMPORTANT: Change this password immediately after first login!',
      );
    } else {
      console.log('ℹ️  Super Admin already exists, skipping creation');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove super admin user
    await queryRunner.query(
      `DELETE FROM admin WHERE staffEmail = 'superadmin@Housemoni'`,
    );

    // Optionally remove the SUPER_ADMIN role if no other admins use it
    const roleInUse = await queryRunner.query(
      `SELECT COUNT(*) as count FROM admin a 
       JOIN admin_role r ON a.roles_id = r.id 
       WHERE r.name = 'SUPER_ADMIN'`,
    );

    if (roleInUse[0].count === 0) {
      await queryRunner.query(
        `DELETE FROM admin_role WHERE name = 'SUPER_ADMIN'`,
      );
    }

    console.log('✅ Super Admin removed successfully');
  }
}
