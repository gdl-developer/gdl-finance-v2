import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFlexiDocumentsTable1770288200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create flexi_documents table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`flexi_documents\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`request_id\` int NOT NULL,
                \`document_type\` varchar(255) NOT NULL,
                \`document_url\` varchar(255) NOT NULL,
                \`file_name\` varchar(255) NULL,
                \`file_size\` varchar(255) NULL,
                \`uploaded_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                KEY \`FK_request_id\` (\`request_id\`),
                CONSTRAINT \`FK_flexi_documents_request\` 
                    FOREIGN KEY (\`request_id\`) 
                    REFERENCES \`flexi_requests\` (\`id\`) 
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

    // Remove documents column from flexi_requests if it exists
    const columnExists = await queryRunner.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'flexi_requests' 
            AND COLUMN_NAME = 'documents'
        `);

    if (columnExists[0].count > 0) {
      await queryRunner.query(`
                ALTER TABLE \`flexi_requests\` DROP COLUMN \`documents\`
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the flexi_documents table
    await queryRunner.query(`DROP TABLE IF EXISTS \`flexi_documents\``);

    // Add back documents column to flexi_requests
    await queryRunner.query(`
            ALTER TABLE \`flexi_requests\` ADD \`documents\` text NULL
        `);
  }
}
