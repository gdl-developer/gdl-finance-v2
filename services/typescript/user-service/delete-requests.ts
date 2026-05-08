import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function deleteFlexiRequests() {
  console.log('🗑️  Starting deletion of all Flexi Requests...');

  const connection = await createConnection({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Both documents and history have CASCADE DELETE at DB level,
    // but we can delete them explicitly if we want to be 100% sure.
    // Let's rely on the CASCADE but run a count check after.

    console.log('Deleting from flexi_requests...');
    const result = await connection.query('DELETE FROM flexi_requests');
    console.log(`✅ Successfully deleted requests.`);

    // Double check documents and history counts
    const docCount = await connection.query(
      'SELECT COUNT(*) as count FROM flexi_documents',
    );
    const histCount = await connection.query(
      'SELECT COUNT(*) as count FROM flexi_approval_history',
    );

    console.log(
      `📊 Remaining: ${docCount[0].count} documents, ${histCount[0].count} history entries.`,
    );

    if (docCount[0].count > 0 || histCount[0].count > 0) {
      console.log('Cleanup of orphaned documents/history...');
      await connection.query('DELETE FROM flexi_documents');
      await connection.query('DELETE FROM flexi_approval_history');
      console.log('✅ Cleaned up orphaned records.');
    }

    console.log('🚀 All Flexi data cleared!');
  } catch (error) {
    console.error('❌ Deletion Failed:', error);
  } finally {
    await connection.close();
  }
}

deleteFlexiRequests();
