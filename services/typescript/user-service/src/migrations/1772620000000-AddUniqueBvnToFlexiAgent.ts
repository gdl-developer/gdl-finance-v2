import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueBvnToFlexiAgent1772620000000
  implements MigrationInterface
{
  name = 'AddUniqueBvnToFlexiAgent1772620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Remove any duplicate BVNs first (keep earliest record, nullify the rest)
    // Using a nested subquery to avoid MySQL "Can't specify target table for update in FROM clause" error
    await queryRunner.query(`
      UPDATE flexi_agents 
      SET bvn = NULL 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT MIN(id) as id 
          FROM flexi_agents 
          WHERE bvn IS NOT NULL 
          GROUP BY bvn
        ) AS tmp
      ) AND bvn IS NOT NULL
    `);

    // 2. Add unique constraint on bvn column if it doesn't exist
    const table = await queryRunner.getTable('flexi_agents');
    const indexExists = table?.indices.find(
      (index) => index.columnNames.includes('bvn') && index.isUnique,
    );

    if (!indexExists) {
      await queryRunner.query(
        `ALTER TABLE \`flexi_agents\` ADD UNIQUE INDEX \`UQ_flexi_agents_bvn\` (\`bvn\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`flexi_agents\` DROP INDEX \`UQ_flexi_agents_bvn\``,
    );
  }
}
