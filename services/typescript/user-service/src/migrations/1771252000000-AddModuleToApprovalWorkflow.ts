import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddModuleToApprovalWorkflow1771252000000 implements MigrationInterface {
  name = 'AddModuleToApprovalWorkflow1771252000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add module column to approval_workflow
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD \`module\` varchar(50) NULL`,
    );

    // Add unique indices to approval_workflow
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD UNIQUE INDEX \`IDX_APPROVAL_WORKFLOW_NAME\` (\`name\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD UNIQUE INDEX \`IDX_APPROVAL_WORKFLOW_MODULE\` (\`module\`)`,
    );

    // Add audit fields to approval_workflow
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD \`createdBy\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD \`updatedBy\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` ADD \`isActive\` tinyint NOT NULL DEFAULT 1`,
    );

    // Add audit fields to approval_workflow_step
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` ADD \`createdBy\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` ADD \`updatedBy\` int NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indices
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP INDEX \`IDX_APPROVAL_WORKFLOW_MODULE\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP INDEX \`IDX_APPROVAL_WORKFLOW_NAME\``,
    );

    // Remove audit fields from approval_workflow_step
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` DROP COLUMN \`updatedBy\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` DROP COLUMN \`createdBy\``,
    );

    // Remove module and audit fields from approval_workflow
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP COLUMN \`isActive\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP COLUMN \`updatedBy\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP COLUMN \`createdBy\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP COLUMN \`module\``,
    );
  }
}
