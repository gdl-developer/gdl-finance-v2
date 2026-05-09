import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlexiRequestSoftDelete1771855341930
  implements MigrationInterface
{
  name = 'AddFlexiRequestSoftDelete1771855341930';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`deleted_at\` datetime(6) NULL`,
      );
    } catch (error) {
      if (error.errno === 1060 || error.code === 'ER_DUP_FIELDNAME') {
        // Column already exists, ignore
        console.log('Column deleted_at already exists, skipping ADD');
      } else {
        throw error;
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`deleted_at\``,
    );
  }
}
