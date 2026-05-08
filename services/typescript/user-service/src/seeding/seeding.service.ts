import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class SeedingService implements OnModuleInit {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    console.log('--- Surgical Database Initialization via Service ---');
    try {
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS \`seeding\` (
          \`id\` varchar(255) NOT NULL,
          \`creationDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB;
      `);
      console.log('Success: "seeding" table exists or was created.');
    } catch (error) {
      console.error('Failed to surgically create "seeding" table:', error);
    }
  }
}
