import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAuditLoggerUserType1771280000000 implements MigrationInterface {
  name = 'FixAuditLoggerUserType1771280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Fixing audit_logger.user_type column...');

    // Convert user_type to varchar(100) to support all UserType enum values:
    // USER, ADMIN, SUPER_ADMIN, FLEXI_AGENT, MICRO_SERVICE
    await queryRunner.query(
      `ALTER TABLE \`audit_logger\` MODIFY COLUMN \`user_type\` varchar(100) NOT NULL`,
    );

    console.log('audit_logger.user_type column fixed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to varchar(50) — note this may truncate existing SUPER_ADMIN / FLEXI_AGENT values
    await queryRunner.query(
      `ALTER TABLE \`audit_logger\` MODIFY COLUMN \`user_type\` varchar(50) NOT NULL`,
    );
  }
}
