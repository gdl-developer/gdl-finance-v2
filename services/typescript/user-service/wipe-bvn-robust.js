const { createConnection } = require('typeorm');
const dotenv = require('dotenv');
const fs = require('fs');

async function findAndWipeBVN() {
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

    // Get all tables
    const tables = await queryRunner.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [env.DB_NAME],
    );

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      const columns = await queryRunner.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [env.DB_NAME, tableName],
      );

      for (const column of columns) {
        const columnName = column.COLUMN_NAME;
        try {
          // Robust query to avoid timestamp errors - check column type first
          const colInfo = await queryRunner.query(
            'SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [env.DB_NAME, tableName, columnName],
          );

          const dataType = colInfo[0].DATA_TYPE;
          if (
            dataType === 'varchar' ||
            dataType === 'text' ||
            dataType === 'char'
          ) {
            const results = await queryRunner.query(
              `SELECT * FROM \`${tableName}\` WHERE \`${columnName}\` = ?`,
              [bvn],
            );

            if (results.length > 0) {
              console.log(
                `FOUND BVN in table: ${tableName}, column: ${columnName}`,
              );
              await queryRunner.query(
                `UPDATE \`${tableName}\` SET \`${columnName}\` = NULL WHERE \`${columnName}\` = ?`,
                [bvn],
              );
              console.log(`Wiped BVN from ${tableName}.${columnName}`);
            }
          }
        } catch (e) {
          // console.error(`Error checking ${tableName}.${columnName}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error('Error finding BVN:', error);
  } finally {
    await connection.close();
  }
}

findAndWipeBVN();
