import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupNullAdminIds1771251000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check how many records will be affected
    const nullSteps = await queryRunner.query(
      `SELECT COUNT(*) as count FROM approval_workflow_step WHERE admin_id IS NULL`,
    );
    console.log(
      `Found ${nullSteps[0].count} workflow steps with NULL admin_id`,
    );

    // Delete workflow steps with NULL admin_id
    await queryRunner.query(
      `DELETE FROM approval_workflow_step WHERE admin_id IS NULL`,
    );

    console.log(
      `✅ Deleted ${nullSteps[0].count} workflow steps with NULL admin_id`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot restore deleted data in down migration
    console.log('⚠️  Cannot restore deleted workflow steps');
  }
}
