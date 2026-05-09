import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlexiAgentLoginHistoryTable1770384500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`flexi_agent_login_history\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`agent_id\` int NOT NULL,
                \`ip_address\` varchar(255) NULL,
                \`user_agent\` varchar(255) NULL,
                \`status\` varchar(255) NOT NULL DEFAULT 'Account was accessed',
                \`login_time\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`FK_agent_id\` (\`agent_id\`),
                CONSTRAINT \`FK_flexi_agent_login_history_agent\` 
                    FOREIGN KEY (\`agent_id\`) 
                    REFERENCES \`flexi_agents\` (\`id\`) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`flexi_agent_login_history\``,
    );
  }
}
