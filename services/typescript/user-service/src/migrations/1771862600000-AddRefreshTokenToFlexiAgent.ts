import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRefreshTokenToFlexiAgent1771862600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTokenColumn = await queryRunner.hasColumn(
      'flexi_agents',
      'refresh_token',
    );
    if (!hasTokenColumn) {
      await queryRunner.addColumn(
        'flexi_agents',
        new TableColumn({
          name: 'refresh_token',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    const hasExpiresColumn = await queryRunner.hasColumn(
      'flexi_agents',
      'refresh_token_expires_at',
    );
    if (!hasExpiresColumn) {
      await queryRunner.addColumn(
        'flexi_agents',
        new TableColumn({
          name: 'refresh_token_expires_at',
          type: 'datetime',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('flexi_agents', 'refresh_token');
    await queryRunner.dropColumn('flexi_agents', 'refresh_token_expires_at');
  }
}
