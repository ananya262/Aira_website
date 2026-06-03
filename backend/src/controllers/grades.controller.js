const { pool, transaction } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { resolveDateRange } = require('../utils/date-range');

function validateMarks({ marks_obtained, total_marks }) {
  if (marks_obtained === undefined || total_marks === undefined) {
    const error = new Error('marks_obtained and total_marks are required');
    error.status = 400;
    throw error;
  }
  if (Number(marks_obtained) < 0 || Number(total_marks) <= 0 || Number(marks_obtained) > Number(total_marks)) {
    const error = new Error('Marks must satisfy 0 <= marks_obtained <= total_marks and total_marks > 0');
    error.status = 400;
    throw error;
  }
}

async function create(req, res) {
  const { student_id, course_id, marks_obtained, total_marks, date_recorded } = req.body;
  validateMarks(req.body);
  const created = await transaction(async (connection) => {
    const [[enrollment]] = await connection.query(
      'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
      [student_id, course_id]
    );
    if (!enrollment) {
      const error = new Error('Student must be enrolled in the course before grade entry');
      error.status = 409;
      throw error;
    }
    const [result] = await connection.query(
      `INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage, date_recorded)
       VALUES (?, ?, ?, ?, 0, COALESCE(?, CURRENT_DATE))`,
      [student_id, course_id, marks_obtained, total_marks, date_recorded || null]
    );
    const [[row]] = await connection.query('SELECT * FROM grades WHERE id = ?', [result.insertId]);
    return row;
  });
  return ok(res, created, 'Grade created', 201);
}

async function getByStudentCourse(req, res) {
  const [rows] = await pool.query(
    `SELECT * FROM grades WHERE student_id = ? AND course_id = ? ORDER BY date_recorded DESC`,
    [req.params.student_id, req.params.course_id]
  );
  return ok(res, rows, 'Grades fetched');
}

async function update(req, res) {
  validateMarks(req.body);
  await pool.query(
    `UPDATE grades SET marks_obtained = ?, total_marks = ?, date_recorded = COALESCE(?, date_recorded)
     WHERE id = ?`,
    [req.body.marks_obtained, req.body.total_marks, req.body.date_recorded || null, req.params.id]
  );
  const [[row]] = await pool.query('SELECT * FROM grades WHERE id = ?', [req.params.id]);
  if (!row) return fail(res, 404, 'Grade not found');
  return ok(res, row, 'Grade updated');
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM grades WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Grade not found');
  return ok(res, { id: Number(req.params.id) }, 'Grade deleted');
}

async function list(req, res) {
  const sortMap = {
    id: 'g.id',
    student_id: 'g.student_id',
    course_id: 'g.course_id',
    student_name: 's.name',
    course_name: 'c.course_name',
    marks_obtained: 'g.marks_obtained',
    total_marks: 'g.total_marks',
    percentage: 'g.percentage',
    date_recorded: 'g.date_recorded',
    created_at: 'g.created_at'
  };
  const requestedSort = req.query.sortBy || 'id';
  const sortBy = sortMap[requestedSort] ? requestedSort : 'id';
  const order = String(req.query.order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const values = [];
  const clauses = [];
  const range = resolveDateRange(req.query.datePreset, req.query.dateFrom, req.query.dateTo);
  if (range.from && range.to) {
    clauses.push('g.date_recorded BETWEEN ? AND ?');
    values.push(range.from, range.to);
  } else if (range.from) {
    clauses.push('g.date_recorded >= ?');
    values.push(range.from);
  } else if (range.to) {
    clauses.push('g.date_recorded <= ?');
    values.push(range.to);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT g.*, s.name AS student_name, c.course_name
     FROM grades g
     JOIN students s ON s.id = g.student_id
     JOIN courses c ON c.id = g.course_id
     ${whereSql}
     ORDER BY ${sortMap[sortBy]} ${order}`,
    values
  );
  return ok(res, rows, 'Grades fetched');
}

module.exports = { create, getByStudentCourse, update, remove, list };
