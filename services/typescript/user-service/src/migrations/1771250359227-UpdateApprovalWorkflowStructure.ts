import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateApprovalWorkflowStructure1771250359227
  implements MigrationInterface
{
  name = 'UpdateApprovalWorkflowStructure1771250359227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop tables if they exist to ensure clean state
    await queryRunner.query(`DROP TABLE IF EXISTS \`approval_workflow_step\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`approval_workflow\``);

    // Create Approval Workflow Table
    await queryRunner.query(
      `CREATE TABLE \`approval_workflow\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Create Approval Workflow Step Table
    await queryRunner.query(
      `CREATE TABLE \`approval_workflow_step\` (\`id\` int NOT NULL AUTO_INCREMENT, \`level\` int NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`workflow_id\` int NULL, \`admin_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    // Add Foreign Keys for Approval Workflow Step
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` ADD CONSTRAINT \`FK_999bc44ee0e50217bd6df7b9361\` FOREIGN KEY (\`workflow_id\`) REFERENCES \`approval_workflow\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` ADD CONSTRAINT \`FK_c8379f386b9ed0248b35a0677d9\` FOREIGN KEY (\`admin_id\`) REFERENCES \`admin\`(\`staffId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop Foreign Keys
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` DROP FOREIGN KEY \`FK_c8379f386b9ed0248b35a0677d9\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`approval_workflow_step\` DROP FOREIGN KEY \`FK_999bc44ee0e50217bd6df7b9361\``,
    );

    // Drop Tables
    await queryRunner.query(`DROP TABLE \`approval_workflow_step\``);
    await queryRunner.query(`DROP TABLE \`approval_workflow\``);
  }
}
