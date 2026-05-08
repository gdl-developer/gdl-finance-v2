import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeAgentFieldsNullable1738679000000 implements MigrationInterface {
  name = 'MakeAgentFieldsNullable1738679000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`first_name\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`last_name\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`phone\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE \`flexi_agents\` SET \`first_name\` = '' WHERE \`first_name\` IS NULL`,
    );
    await queryRunner.query(
      `UPDATE \`flexi_agents\` SET \`last_name\` = '' WHERE \`last_name\` IS NULL`,
    );
    await queryRunner.query(
      `UPDATE \`flexi_agents\` SET \`phone\` = '0000000000' WHERE \`phone\` IS NULL`,
    ); // potential data loss on revert if duplicates exist, but minimal risk for this stage

    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`first_name\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`last_name\` varchar(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` MODIFY \`phone\` varchar(255) NOT NULL`,
    );
  }
}
