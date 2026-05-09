import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixApprovalWorkflowColumnNames1771255000000
  implements MigrationInterface
{
  name = 'FixApprovalWorkflowColumnNames1771255000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only adjust description length to 500 (matching entity)
    // Others (workflow_name, indices) are already correct in the database
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` MODIFY COLUMN \`description\` varchar(500) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` MODIFY COLUMN \`description\` varchar(255) NULL`,
    );
  }
}
