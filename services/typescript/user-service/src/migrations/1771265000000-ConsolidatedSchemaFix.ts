import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidatedSchemaFix1771265000000 implements MigrationInterface {
  name = 'ConsolidatedSchemaFix1771265000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Fix gdl_marketers table
    console.log('Checking gdl_marketers schema...');
    const hasOfficeBranch = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch',
    );
    const hasOfficeBranchName = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch_name',
    );
    const hasOfficeBranchId = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch_id',
    );

    if (hasOfficeBranch && !hasOfficeBranchName) {
      console.log(
        'Renaming office_branch to office_branch_name in gdl_marketers',
      );
      await queryRunner.query(
        'ALTER TABLE gdl_marketers CHANGE office_branch office_branch_name varchar(255) NULL',
      );
    } else if (!hasOfficeBranch && !hasOfficeBranchName) {
      console.log('Adding office_branch_name to gdl_marketers');
      await queryRunner.query(
        'ALTER TABLE gdl_marketers ADD COLUMN office_branch_name varchar(255) NULL',
      );
    }

    if (!hasOfficeBranchId) {
      console.log('Adding office_branch_id to gdl_marketers');
      await queryRunner.query(
        'ALTER TABLE gdl_marketers ADD COLUMN office_branch_id int NULL',
      );
    }

    // 2. Fix audit_logger and flexi status columns
    console.log('Fixing audit_logger and flexi status columns...');
    await queryRunner.query(
      'ALTER TABLE audit_logger MODIFY COLUMN user_type varchar(100) NOT NULL',
    );
    await queryRunner.query(
      "ALTER TABLE flexi_requests MODIFY COLUMN status varchar(100) DEFAULT 'PENDING_DOCS'",
    );
    await queryRunner.query(
      "ALTER TABLE flexi_approval_history MODIFY COLUMN status varchar(100) DEFAULT 'PENDING_APPROVAL'",
    );

    // 3. Fix approval_workflow_step - branch restriction flag
    const hasRestrictionFlag = await queryRunner.hasColumn(
      'approval_workflow_step',
      'enforce_branch_restriction',
    );
    if (!hasRestrictionFlag) {
      console.log(
        'Adding enforce_branch_restriction to approval_workflow_step',
      );
      await queryRunner.query(
        'ALTER TABLE approval_workflow_step ADD COLUMN enforce_branch_restriction tinyint(1) DEFAULT 0',
      );
    }

    console.log('Consolidated schema fix completed successfully.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback is usually not needed for these kinds of "repair" migrations
  }
}
