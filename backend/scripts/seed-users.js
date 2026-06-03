require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const users = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'faculty', password: 'faculty123', role: 'faculty' },
  { username: 'student', password: 'student123', role: 'student' }
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await pool.query(
      `INSERT INTO app_users (username, password_hash, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), is_active = TRUE`,
      [user.username, passwordHash, user.role]
    );
    console.log(`Seeded ${user.role}: ${user.username} / ${user.password}`);
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
