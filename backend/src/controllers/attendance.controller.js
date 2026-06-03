const { pool, transaction } = require('../config/db');
const { ok, fail } = require('../utils/response');
const { resolveDateRange } = require('../utils/date-range');

async function bulkCreate(req, res) {
  const records = Array.isArray(req.body.records) ? req.body.records : [req.body];
  if (!records.length) {
    const error = new Error('At least one attendance record is required');
    error.status = 400;
    throw error;
  }

  const saved = await transaction(async (connection) => {
    const output = [];
    for (const record of records) {
      const { student_id, course_id, attendance_date, is_present = true, class_count = 1 } = record;
      if (!student_id || !course_id || !attendance_date) {
        const error = new Error('student_id, course_id, and attendance_date are required');
        error.status = 400;
        throw error;
      }
      const [result] = await connection.query(
        `INSERT INTO attendance (student_id, course_id, attendance_date, is_present, class_count)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_present = VALUES(is_present), class_count = VALUES(class_count)`,
        [student_id, course_id, attendance_date, Boolean(is_present), class_count]
      );
      output.push({ student_id, course_id, attendance_date, affectedRows: result.affectedRows });
    }
    return output;
  });

  return ok(res, saved, 'Attendance saved', 201);
}

async function getByStudentCourse(req, res) {
  const [rows] = await pool.query(
    `SELECT * FROM attendance WHERE student_id = ? AND course_id = ? ORDER BY attendance_date DESC`,
    [req.params.student_id, req.params.course_id]
  );
  return ok(res, rows, 'Attendance fetched');
}

async function list(req, res) {
  const sortMap = {
    id: 'a.id',
    student_id: 'a.student_id',
    course_id: 'a.course_id',
    student_name: 's.name',
    course_name: 'c.course_name',
    attendance_date: 'a.attendance_date',
    class_count: 'a.class_count',
    created_at: 'a.created_at'
  };
  const requestedSort = req.query.sortBy || 'id';
  const sortBy = sortMap[requestedSort] ? requestedSort : 'id';
  const order = String(req.query.order || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  const values = [];
  const clauses = [];
  const range = resolveDateRange(req.query.datePreset, req.query.dateFrom, req.query.dateTo);
  if (range.from && range.to) {
    clauses.push('a.attendance_date BETWEEN ? AND ?');
    values.push(range.from, range.to);
  } else if (range.from) {
    clauses.push('a.attendance_date >= ?');
    values.push(range.from);
  } else if (range.to) {
    clauses.push('a.attendance_date <= ?');
    values.push(range.to);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT a.*, s.name AS student_name, c.course_name
     FROM attendance a
     JOIN students s ON s.id = a.student_id
     JOIN courses c ON c.id = a.course_id
     ${whereSql}
     ORDER BY ${sortMap[sortBy]} ${order}`,
    values
  );
  return ok(res, rows, 'Attendance fetched');
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return fail(res, 404, 'Attendance record not found');
  return ok(res, { id: Number(req.params.id) }, 'Attendance deleted');
}

module.exports = { bulkCreate, getByStudentCourse, list, remove };
