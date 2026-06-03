const { pool, transaction } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { resolveDateRange } = require('../utils/date-range');

async function list(req, res) {
  const sortMap = {
    id: 'e.id',
    student_id: 'e.student_id',
    course_id: 'e.course_id',
    student_name: 's.name',
    course_name: 'c.course_name',
    enrollment_date: 'e.enrollment_date',
    status: 'e.status',
    created_at: 'e.created_at'
  };
  const requestedSort = req.query.sortBy || 'id';
  const sortBy = sortMap[requestedSort] ? requestedSort : 'id';
  const order = String(req.query.order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const values = [];
  const clauses = [];
  const range = resolveDateRange(req.query.datePreset, req.query.dateFrom, req.query.dateTo);
  if (range.from && range.to) {
    clauses.push('e.enrollment_date BETWEEN ? AND ?');
    values.push(range.from, range.to);
  } else if (range.from) {
    clauses.push('e.enrollment_date >= ?');
    values.push(range.from);
  } else if (range.to) {
    clauses.push('e.enrollment_date <= ?');
    values.push(range.to);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT e.*, s.name AS student_name, c.course_name
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN courses c ON c.id = e.course_id
     ${whereSql}
     ORDER BY ${sortMap[sortBy]} ${order}`,
    values
  );
  return ok(res, rows, 'Enrollments fetched');
}

async function get(req, res) {
  const [rows] = await pool.query(
    `SELECT e.*, s.name AS student_name, c.course_name
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN courses c ON c.id = e.course_id
     WHERE e.id = ?`,
    [req.params.id]
  );
  if (!rows[0]) return fail(res, 404, 'Enrollment not found');
  return ok(res, rows[0], 'Enrollment fetched');
}

async function create(req, res) {
  const { student_id, course_id, enrollment_date, status = 'active' } = req.body;
  if (!student_id || !course_id) {
    const error = new Error('student_id and course_id are required');
    error.status = 400;
    throw error;
  }

  const created = await transaction(async (connection) => {
    const [[student]] = await connection.query('SELECT id FROM students WHERE id = ?', [student_id]);
    const [[course]] = await connection.query('SELECT id FROM courses WHERE id = ?', [course_id]);
    if (!student || !course) {
      const error = new Error('Student or course does not exist');
      error.status = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
       VALUES (?, ?, COALESCE(?, CURRENT_DATE), ?)`,
      [student_id, course_id, enrollment_date || null, status]
    );
    const [[row]] = await connection.query('SELECT * FROM enrollments WHERE id = ?', [result.insertId]);
    return row;
  });

  return ok(res, created, 'Enrollment created', 201);
}

async function update(req, res) {
  const allowed = ['active', 'completed', 'cancelled'];
  if (!allowed.includes(req.body.status)) {
    const error = new Error('status must be active, completed, or cancelled');
    error.status = 400;
    throw error;
  }
  await pool.query('UPDATE enrollments SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  return get(req, res);
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM enrollments WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Enrollment not found');
  return ok(res, { id: Number(req.params.id) }, 'Enrollment deleted');
}

module.exports = { list, get, create, update, remove };
