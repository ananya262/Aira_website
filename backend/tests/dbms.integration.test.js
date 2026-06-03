require('dotenv').config();

const test = require('node:test');
const assert = require('node:assert/strict');
const { pool, transaction } = require('../src/config/db');

const runDbTests = process.env.RUN_DB_TESTS === '1';

async function seedStudentCourse() {
  return transaction(async (connection) => {
    const email = `test.${Date.now()}@aira.test`;
    const code = `T${Date.now()}`;
    const [studentResult] = await connection.query(
      `INSERT INTO students (name, email, phone, grade_level, joining_date)
       VALUES (?, ?, ?, ?, CURRENT_DATE)`,
      ['Integration Student', email, '9999999999', 'Grade 9']
    );
    const [courseResult] = await connection.query(
      `INSERT INTO courses (course_name, grade_level, course_code, duration_hours, max_capacity)
       VALUES (?, ?, ?, ?, ?)`,
      ['Integration Maths', 'Grade 9', code, 80, 30]
    );
    await connection.query(
      'INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)',
      [studentResult.insertId, courseResult.insertId]
    );
    return { studentId: studentResult.insertId, courseId: courseResult.insertId };
  });
}

test('duplicate enrollment is rejected', { skip: !runDbTests }, async () => {
  const { studentId, courseId } = await seedStudentCourse();
  await assert.rejects(
    () => pool.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [studentId, courseId]),
    /Duplicate|unique|Duplicate enrollment/i
  );
});

test('invalid enrollment foreign key is rejected', { skip: !runDbTests }, async () => {
  await assert.rejects(
    () => pool.query('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [99999999, 99999999]),
    /foreign key|referenced/i
  );
});

test('marks greater than total marks are rejected', { skip: !runDbTests }, async () => {
  const { studentId, courseId } = await seedStudentCourse();
  await assert.rejects(
    () => pool.query(
      `INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage)
       VALUES (?, ?, 110, 100, 0)`,
      [studentId, courseId]
    ),
    /check|constraint/i
  );
});

test('grade trigger recalculates GPA statistics', { skip: !runDbTests }, async () => {
  const { studentId, courseId } = await seedStudentCourse();
  await pool.query(
    `INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage)
     VALUES (?, ?, 80, 100, 0), (?, ?, 90, 100, 0)`,
    [studentId, courseId, studentId, courseId]
  );
  const [[stats]] = await pool.query('SELECT average_percentage, gpa FROM student_statistics WHERE student_id = ?', [studentId]);
  assert.equal(Number(stats.average_percentage), 85);
  assert.equal(Number(stats.gpa), 8.5);
});

test('attendance trigger recalculates attendance percentage', { skip: !runDbTests }, async () => {
  const { studentId, courseId } = await seedStudentCourse();
  await pool.query(
    `INSERT INTO attendance (student_id, course_id, attendance_date, is_present, class_count)
     VALUES (?, ?, CURRENT_DATE, TRUE, 1)`,
    [studentId, courseId]
  );
  const [[stats]] = await pool.query('SELECT attendance_percentage FROM student_statistics WHERE student_id = ?', [studentId]);
  assert.equal(Number(stats.attendance_percentage), 100);
});

test('student cascade delete removes transactional rows', { skip: !runDbTests }, async () => {
  const { studentId, courseId } = await seedStudentCourse();
  await pool.query(
    `INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage)
     VALUES (?, ?, 70, 100, 0)`,
    [studentId, courseId]
  );
  await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
  const [[gradeCount]] = await pool.query('SELECT COUNT(*) AS total FROM grades WHERE student_id = ?', [studentId]);
  const [[enrollmentCount]] = await pool.query('SELECT COUNT(*) AS total FROM enrollments WHERE student_id = ?', [studentId]);
  assert.equal(gradeCount.total, 0);
  assert.equal(enrollmentCount.total, 0);
});

test('analytical views respond within two seconds', { skip: !runDbTests }, async () => {
  const started = Date.now();
  await pool.query('SELECT * FROM v_student_performance LIMIT 100');
  await pool.query('SELECT * FROM v_course_utilization LIMIT 100');
  await pool.query('SELECT * FROM v_faculty_workload LIMIT 100');
  await pool.query('SELECT * FROM v_attendance_summary LIMIT 100');
  assert.ok(Date.now() - started < 2000);
});
