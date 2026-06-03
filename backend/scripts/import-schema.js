require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  try {
    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'aira_dbms';

    console.log(`Connecting to MySQL at ${host}:${port} as ${user}`);

    const connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

    // ensure database exists before importing
    console.log(`Ensuring database '${database}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    const sqlPath = path.resolve(__dirname, '..', '..', 'aira_dbms_schema.sql');
    console.log('Reading SQL file:', sqlPath);
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Convert mysql client DELIMITER blocks into standard statements by replacing $$ with ;
    sql = sql.replace(/DELIMITER\s+\$\$/g, '');
    sql = sql.replace(/DELIMITER\s+;/g, '');
    sql = sql.replace(/\$\$/g, ';');

    console.log('Executing SQL (this may take a moment)...');
    await connection.query(sql);
    console.log('Schema import completed successfully.');

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error importing schema:');
    if (err && err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((e, i) => {
        console.error(`#${i+1}:`, e && e.stack ? e.stack : e);
      });
    } else if (err && err.stack) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
})();
