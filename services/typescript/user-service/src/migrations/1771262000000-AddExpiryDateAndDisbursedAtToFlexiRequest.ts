import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiryDateAndDisbursedAtToFlexiRequest1771262000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add disbursed_at column if it doesn't already exist
    const hasDisbursedAt = await queryRunner.hasColumn(
      'flexi_requests',
      'disbursed_at',
    );
    if (!hasDisbursedAt) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD COLUMN \`disbursed_at\` datetime NULL`,
      );
    }

    // Add expiry_date column if it doesn't already exist
    const hasExpiryDate = await queryRunner.hasColumn(
      'flexi_requests',
      'expiry_date',
    );
    if (!hasExpiryDate) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD COLUMN \`expiry_date\` datetime NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`expiry_date\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`disbursed_at\``,
    );
  }
}
