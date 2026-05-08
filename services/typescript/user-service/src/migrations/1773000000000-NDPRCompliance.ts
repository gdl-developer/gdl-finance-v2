import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class NDPRCompliance1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add compliance columns to user_account if they don't exist
    const columnsToAdd = [
      { name: 'terms_accepted', type: 'tinyint', default: 0 },
      { name: 'privacy_policy_accepted', type: 'tinyint', default: 0 },
      { name: 'marketing_consent', type: 'tinyint', default: 0 },
      { name: 'consent_timestamp', type: 'timestamp', isNullable: true },
      {
        name: 'policy_version',
        type: 'varchar',
        length: '50',
        isNullable: true,
      },
      { name: 'is_deleted', type: 'tinyint', default: 0 },
      { name: 'deleted_at', type: 'timestamp', isNullable: true },
    ];

    for (const col of columnsToAdd) {
      if (!(await queryRunner.hasColumn('user_account', col.name))) {
        await queryRunner.addColumn(
          'user_account',
          new TableColumn(col as any),
        );
      }
    }

    // 2. Create consent_audit_logs table if it doesn't exist
    if (!(await queryRunner.hasTable('consent_audit_logs'))) {
      await queryRunner.createTable(
        new Table({
          name: 'consent_audit_logs',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            { name: 'user_id', type: 'int' },
            { name: 'terms_accepted', type: 'tinyint' },
            { name: 'privacy_policy_accepted', type: 'tinyint' },
            { name: 'marketing_consent', type: 'tinyint' },
            { name: 'policy_version', type: 'varchar', length: '50' },
            {
              name: 'ip_address',
              type: 'varchar',
              length: '100',
              isNullable: true,
            },
            { name: 'user_agent', type: 'text', isNullable: true },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // 3. Add Foreign Key
      await queryRunner.createForeignKey(
        'consent_audit_logs',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'user_account',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('consent_audit_logs');
    await queryRunner.dropColumns('user_account', [
      'terms_accepted',
      'privacy_policy_accepted',
      'marketing_consent',
      'consent_timestamp',
      'policy_version',
      'is_deleted',
      'deleted_at',
    ]);
  }
}
