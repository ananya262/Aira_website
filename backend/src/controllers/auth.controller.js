const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { ok } = require('../utils/response');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.status = 400;
    throw error;
  }

  const [rows] = await pool.query(
    `SELECT id, username, password_hash, role, student_id, faculty_id
     FROM app_users
     WHERE username = ? AND is_active = TRUE`,
    [username]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    const error = new Error('Invalid username or password');
    error.status = 401;
    throw error;
  }

  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    student_id: user.student_id,
    faculty_id: user.faculty_id
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-change-me', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });

  return ok(res, { token, user: payload }, 'Login successful');
}

module.exports = { login };
