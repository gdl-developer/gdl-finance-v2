import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddBranchToFlexiMarketers1740300000000
  implements MigrationInterface
{
  name = 'AddBranchToFlexiMarketers1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Handle office_branch to office_branch_name transition
    const hasOfficeBranch = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch',
    );
    const hasOfficeBranchName = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch_name',
    );

    if (hasOfficeBranch && !hasOfficeBranchName) {
      await queryRunner.renameColumn(
        'gdl_marketers',
        'office_branch',
        'office_branch_name',
      );
    } else if (!hasOfficeBranch && !hasOfficeBranchName) {
      await queryRunner.addColumn(
        'gdl_marketers',
        new TableColumn({
          name: 'office_branch_name',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    // 2. Add office_branch_id column if it doesn't exist
    const hasOfficeBranchId = await queryRunner.hasColumn(
      'gdl_marketers',
      'office_branch_id',
    );
    if (!hasOfficeBranchId) {
      await queryRunner.addColumn(
        'gdl_marketers',
        new TableColumn({
          name: 'office_branch_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    // 3. Add foreign key for office_branch_id if it doesn't exist
    const table = await queryRunner.getTable('gdl_marketers');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('office_branch_id') !== -1,
    );
    if (!foreignKey) {
      await queryRunner.createForeignKey(
        'gdl_marketers',
        new TableForeignKey({
          columnNames: ['office_branch_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'office_branch',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('gdl_marketers');
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('office_branch_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('gdl_marketers', foreignKey);
    }

    await queryRunner.dropColumn('gdl_marketers', 'office_branch_id');

    await queryRunner.renameColumn(
      'gdl_marketers',
      'office_branch_name',
      'office_branch',
    );
  }
}
