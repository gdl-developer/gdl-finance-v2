const typeorm = require('typeorm');
require('dotenv').config();

async function runMigration() {
  try {
    const connection = await typeorm.createConnection({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database:', process.env.DB_NAME);

    // Run the ALTER TABLE command
    await connection.query(
      'ALTER TABLE flexi_documents MODIFY COLUMN document_url TEXT',
    );
    console.log('✅ Successfully changed document_url column to TEXT');

    // Verify the change
    const result = await connection.query('DESCRIBE flexi_documents');
    const documentUrlColumn = result.find(
      (col) => col.Field === 'document_url',
    );
    console.log('\n📋 document_url column info:');
    console.log('  Type:', documentUrlColumn.Type);
    console.log('  Null:', documentUrlColumn.Null);
    console.log('  Default:', documentUrlColumn.Default);

    await connection.close();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
