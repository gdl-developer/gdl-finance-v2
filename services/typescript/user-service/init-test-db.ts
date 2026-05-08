import * as dotenv from 'dotenv';
dotenv.config();

import { createConnection } from 'typeorm';
import * as connectionOptions from './ormconfig';

async function initTestDb() {
  console.log('--- Surgical Database Initialization ---');
  console.log('Target Username:', (connectionOptions as any).username);
  console.log('Target Database:', (connectionOptions as any).database);

  try {
    const connection = await createConnection({
      ...connectionOptions,
      synchronize: false, // Ensure we don't trigger the crash
    });

    console.log('Connected successfully!');

    console.log('Checking/Creating "seeding" table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`seeding\` (
        \`id\` varchar(255) NOT NULL,
        \`creationDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB;
    `);
    console.log('Success: "seeding" table is ready.');

    // Check if seeding entries exist (optional)
    const count = await connection.query(
      'SELECT COUNT(*) as count FROM seeding',
    );
    console.log(`Current seeding entries: ${count[0].count}`);

    await connection.close();
    console.log('--- Initialization Finished ---');
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

initTestDb();
