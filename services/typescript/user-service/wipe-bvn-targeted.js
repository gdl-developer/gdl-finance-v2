const { createConnection } = require('typeorm');
const dotenv = require('dotenv');
const fs = require('fs');

async function wipeBVN() {
  const bvn = '22160668166';

  // Load env
  const env = dotenv.parse(fs.readFileSync('.env.staging'));

  const connection = await createConnection({
    type: 'mysql',
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    synchronize: false,
  });

  try {
    const queryRunner = connection.createQueryRunner();

    // Check owner_doc table
    const results = await queryRunner.query(
      'SELECT id, user_id FROM owner_doc WHERE identification_number = ?',
      [bvn],
    );

    if (results.length > 0) {
      console.log(
        `Found BVN in owner_doc table for user_id: ${results[0].user_id}`,
      );
      await queryRunner.query(
        'UPDATE owner_doc SET identification_number = NULL WHERE identification_number = ?',
        [bvn],
      );
      console.log('Wiped BVN from owner_doc');
    } else {
      console.log('BVN not found in owner_doc');
    }
  } catch (error) {
    console.error('Error wiping BVN:', error);
  } finally {
    await connection.close();
  }
}

wipeBVN();
