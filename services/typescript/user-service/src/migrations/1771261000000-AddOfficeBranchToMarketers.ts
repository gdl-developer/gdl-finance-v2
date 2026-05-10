import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfficeBranchToMarketers1771261000000
  implements MigrationInterface
{
  name = 'AddOfficeBranchToMarketers1771261000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add phone_number column if it doesn't already exist
    const hasPhoneNumber = await queryRunner.hasColumn(
      'gdl_marketers',
      'phone_number',
    );
    if (!hasPhoneNumber) {
      await queryRunner.query(
        `ALTER TABLE \`gdl_marketers\` ADD COLUMN \`phone_number\` varchar(255) NULL`,
      );
    }

    // Add office_branch column
    const hasOfficeBranch = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch',
    );
    if (!hasOfficeBranch) {
      await queryRunner.query(
        `ALTER TABLE \`gdl_marketers\` ADD COLUMN \`office_branch\` varchar(255) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`gdl_marketers\` DROP COLUMN \`office_branch\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`gdl_marketers\` DROP COLUMN \`phone_number\``,
    );
  }
}
