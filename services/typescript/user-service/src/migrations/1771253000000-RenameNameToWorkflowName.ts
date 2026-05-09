import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameNameToWorkflowName1771253000000 implements MigrationInterface {
  name = 'RenameNameToWorkflowName1771253000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename name column to workflow_name in approval_workflow
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` RENAME COLUMN \`name\` TO \`workflow_name\``,
    );

    // Rename index
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` RENAME INDEX \`IDX_APPROVAL_WORKFLOW_NAME\` TO \`IDX_APPROVAL_WORKFLOW_WORKFLOW_NAME\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert index name
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` RENAME INDEX \`IDX_APPROVAL_WORKFLOW_WORKFLOW_NAME\` TO \`IDX_APPROVAL_WORKFLOW_NAME\``,
    );

    // Revert workflow_name column to name
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` RENAME COLUMN \`workflow_name\` TO \`name\``,
    );
  }
}
