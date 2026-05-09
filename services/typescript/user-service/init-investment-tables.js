const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({ path: './User-Service/.env' });

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 30000,
  ssl: {
    rejectUnauthorized: false,
  },
});

connection.connect();

async function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

const COMMON_COLUMNS = `
  id int(11) NOT NULL AUTO_INCREMENT,
  user_id int(11) DEFAULT NULL,
  first_name varchar(30) DEFAULT NULL,
  last_name varchar(30) DEFAULT NULL,
  account varchar(100) NOT NULL,
  date date NOT NULL,
  price decimal(20,2) NOT NULL,
  quantity decimal(20,2) NOT NULL,
  reference varchar(100) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  admin_notes text DEFAULT NULL,
  approved_by int(11) DEFAULT NULL,
  approved_at timestamp NULL DEFAULT NULL,
  rejected_by int(11) DEFAULT NULL,
  rejected_at timestamp NULL DEFAULT NULL,
  FundAccountNo text DEFAULT NULL,
  CashAccountNo text DEFAULT NULL,
  created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY IDX_reference (reference)
`;

async function init() {
  try {
    console.log('--- Initializing Investment Module Tables ---');

    const tables = [
      {
        name: 'mmf_investment_request',
        sql: `CREATE TABLE IF NOT EXISTS mmf_investment_request (${COMMON_COLUMNS}, flexi_agent_id int(11) DEFAULT NULL) ENGINE=InnoDB`,
      },
      {
        name: 'income_investment_request',
        sql: `CREATE TABLE IF NOT EXISTS income_investment_request (${COMMON_COLUMNS}) ENGINE=InnoDB`,
      },
      {
        name: 'canary_investment_request',
        sql: `CREATE TABLE IF NOT EXISTS canary_investment_request (${COMMON_COLUMNS}) ENGINE=InnoDB`,
      },
      {
        name: 'fund_redemption_mmf_requests',
        sql: `CREATE TABLE IF NOT EXISTS fund_redemption_mmf_requests (${COMMON_COLUMNS}) ENGINE=InnoDB`,
      },
      {
        name: 'redemption_income_request',
        sql: `CREATE TABLE IF NOT EXISTS redemption_income_request (${COMMON_COLUMNS}) ENGINE=InnoDB`,
      },
      {
        name: 'redemption_canary_request',
        sql: `CREATE TABLE IF NOT EXISTS redemption_canary_request (${COMMON_COLUMNS}) ENGINE=InnoDB`,
      },
    ];

    for (const table of tables) {
      console.log(`Creating table ${table.name}...`);
      await runQuery(table.sql);
      console.log(`✅ Table ${table.name} ready.`);
    }

    console.log('--- Investment Module Tables Initialized Successfully ---');
  } catch (error) {
    console.error('Initialization failed:', error.message);
  } finally {
    connection.end();
  }
}

init();
