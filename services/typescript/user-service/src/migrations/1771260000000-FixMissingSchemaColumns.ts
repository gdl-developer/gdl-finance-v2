import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixMissingSchemaColumns1771260000000 implements MigrationInterface {
  name = 'FixMissingSchemaColumns1771260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add deletedAt to approval_workflow
    // Check if it exists first to be safe
    const hasDeletedAt = await queryRunner.hasColumn(
      'approval_workflow',
      'deletedAt',
    );
    if (!hasDeletedAt) {
      await queryRunner.query(
        `ALTER TABLE \`approval_workflow\` ADD COLUMN \`deletedAt\` timestamp(6) NULL`,
      );
    }

    // 2. Fix audit_logger ID to be AUTO_INCREMENT
    // We need to modify the column. Note: This might require dropping and recreating foreign keys if they exist,
    // but audit_logger usually doesn't have outgoing FKs that target it.
    await queryRunner.query(
      `ALTER TABLE \`audit_logger\` MODIFY COLUMN \`id\` int NOT NULL AUTO_INCREMENT`,
    );

    // 3. Add deletedAt to approval_workflow_step as well for consistency
    const hasStepDeletedAt = await queryRunner.hasColumn(
      'approval_workflow_step',
      'deletedAt',
    );
    if (!hasStepDeletedAt) {
      await queryRunner.query(
        `ALTER TABLE \`approval_workflow_step\` ADD COLUMN \`deletedAt\` timestamp(6) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` DROP COLUMN \`deletedAt\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logger\` MODIFY COLUMN \`id\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow\` DROP COLUMN \`deletedAt\``,
    );
  }
}
