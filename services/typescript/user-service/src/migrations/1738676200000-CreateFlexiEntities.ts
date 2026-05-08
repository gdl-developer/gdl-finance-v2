import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class CreateFlexiEntities1738676200000 implements MigrationInterface {
  name = 'CreateFlexiEntities1738676200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create gdl_marketers table
    await queryRunner.createTable(
      new Table({
        name: 'gdl_marketers',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'first_name',
            type: 'varchar',
          },
          {
            name: 'last_name',
            type: 'varchar',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'code',
            type: 'varchar',
            isUnique: true,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. Create flexi_agents table
    await queryRunner.createTable(
      new Table({
        name: 'flexi_agents',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'first_name',
            type: 'varchar',
          },
          {
            name: 'last_name',
            type: 'varchar',
          },
          {
            name: 'phone',
            type: 'varchar',
          },
          {
            name: 'is_email_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'otp_code',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'otp_expires_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'date_of_birth',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bvn',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'bvn_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'country',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'profile_completed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 3. Update flexi_requests table columns
    const flexiRequestTable = await queryRunner.getTable('flexi_requests');
    if (flexiRequestTable) {
      // Check and add agent_id column
      if (!flexiRequestTable.findColumnByName('agent_id')) {
        await queryRunner.addColumn(
          'flexi_requests',
          new TableColumn({
            name: 'agent_id',
            type: 'int',
            isNullable: true,
          }),
        );
      }

      // Check and add marketer_id column
      if (!flexiRequestTable.findColumnByName('marketer_id')) {
        await queryRunner.addColumn(
          'flexi_requests',
          new TableColumn({
            name: 'marketer_id',
            type: 'int',
            isNullable: true,
          }),
        );
      }

      // Add Foreign Keys
      await queryRunner.createForeignKey(
        'flexi_requests',
        new TableForeignKey({
          columnNames: ['agent_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'flexi_agents',
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createForeignKey(
        'flexi_requests',
        new TableForeignKey({
          columnNames: ['marketer_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'gdl_marketers',
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const flexiRequestTable = await queryRunner.getTable('flexi_requests');

    if (flexiRequestTable) {
      const agentForeignKey = flexiRequestTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('agent_id') !== -1,
      );
      if (agentForeignKey)
        await queryRunner.dropForeignKey('flexi_requests', agentForeignKey);

      const marketerForeignKey = flexiRequestTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('marketer_id') !== -1,
      );
      if (marketerForeignKey)
        await queryRunner.dropForeignKey('flexi_requests', marketerForeignKey);

      if (flexiRequestTable.findColumnByName('agent_id'))
        await queryRunner.dropColumn('flexi_requests', 'agent_id');
      if (flexiRequestTable.findColumnByName('marketer_id'))
        await queryRunner.dropColumn('flexi_requests', 'marketer_id');
    }

    await queryRunner.dropTable('flexi_agents');
    await queryRunner.dropTable('gdl_marketers');
  }
}
