import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedSecurityQuestions1764333221012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`security_question\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`question\` varchar(255) NOT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_security_question_question\` (\`question\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB`,
    );

    // Insert data with properly escaped single quotes
    await queryRunner.query(
      `INSERT INTO \`security_question\` (\`question\`) VALUES
                ('What is your mother''s maiden name?'),
                ('What was the name of your first pet?'),
                ('What was the make of your first car?'),
                ('What is the name of the town where you were born?'),
                ('What is your favorite food?')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`security_question\``);
  }
}
