import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtensionFieldsToFlexiRequestManual1772534460932 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('flexi_requests', 'extension_tenure'))) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`extension_tenure\` varchar(255) NULL`,
      );
    }
    if (!(await queryRunner.hasColumn('flexi_requests', 'extension_rate'))) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`extension_rate\` decimal(18,2) NOT NULL DEFAULT '0.00'`,
      );
    }
    if (!(await queryRunner.hasColumn('flexi_requests', 'extension_amount'))) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`extension_amount\` decimal(18,2) NOT NULL DEFAULT '0.00'`,
      );
    }
    if (
      !(await queryRunner.hasColumn(
        'flexi_requests',
        'extension_payment_confirmed',
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`extension_payment_confirmed\` tinyint NOT NULL DEFAULT 0`,
      );
    }
    if (
      !(await queryRunner.hasColumn('flexi_requests', 'is_extension_active'))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_requests\` ADD \`is_extension_active\` tinyint NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`is_extension_active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`extension_payment_confirmed\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`extension_amount\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`extension_rate\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`flexi_requests\` DROP COLUMN \`extension_tenure\``,
    );
  }
}
