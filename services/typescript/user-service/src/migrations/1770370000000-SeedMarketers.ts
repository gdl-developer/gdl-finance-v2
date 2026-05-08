import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMarketers1770370000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Using IGNORE to prevent errors if already seeded by previous attempts
    await queryRunner.query(`
            INSERT IGNORE INTO gdl_marketers (first_name, last_name, email, code, created_at, updated_at) VALUES
            ('John', 'Doe', 'john.doe@housemoni.ng', 'MK001', NOW(), NOW()),
            ('Jane', 'Smith', 'jane.smith@housemoni.ng', 'MK002', NOW(), NOW()),
            ('Michael', 'Johnson', 'michael.johnson@housemoni.ng', 'MK003', NOW(), NOW()),
            ('Kikiope', 'O', 'kikis.o@housemoni.ng', 'MK004', NOW(), NOW());
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM gdl_marketers WHERE email IN ('john.doe@housemoni.ng', 'jane.smith@housemoni.ng', 'michael.johnson@housemoni.ng', 'kikis.o@housemoni.ng');
        `);
  }
}
