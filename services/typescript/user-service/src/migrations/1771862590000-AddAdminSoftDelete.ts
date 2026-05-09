import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAdminSoftDelete1771862590000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('admin', 'deletedAt');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'admin',
        new TableColumn({
          name: 'deletedAt',
          type: 'datetime',
          precision: 6,
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('admin', 'deletedAt');
    if (hasColumn) {
      await queryRunner.dropColumn('admin', 'deletedAt');
    }
  }
}
