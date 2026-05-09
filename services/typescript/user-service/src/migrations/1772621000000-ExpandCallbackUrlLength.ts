import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandCallbackUrlLength1772621000000
  implements MigrationInterface
{
  name = 'ExpandCallbackUrlLength1772621000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 🚀 Increase callback_url column length to 255
    await queryRunner.query(
      `ALTER TABLE virtual_wallet MODIFY callback_url VARCHAR(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ⏪ Revert to 50 (be careful, this might truncate existing long URLs)
    await queryRunner.query(
      `ALTER TABLE virtual_wallet MODIFY callback_url VARCHAR(50) NULL`,
    );
  }
}
