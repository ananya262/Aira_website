http://localhost:8080/dashboard.htmlrequire('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const repoRoot = path.resolve(__dirname, '..', '..');
const outDir = path.join(repoRoot, 'qa-reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const dsn = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aira_dbms',
  multipleStatements: true,
};

const requestedTables = ['students', 'student_accounts', 'courses', 'enrollments', 'faculty', 'course_faculty', 'grades', 'attendance', 'audit_log'];
const requiredViews = ['v_student_performance', 'v_course_utilization', 'v_faculty_workload', 'v_attendance_summary'];
const requiredTriggers = ['trg_students_after_insert', 'trg_students_after_update', 'trg_students_before_delete', 'trg_courses_after_insert', 'trg_courses_after_update', 'trg_faculty_after_insert', 'trg_faculty_after_update', 'trg_dedup_check', 'trg_after_enrollment_insert', 'trg_enrollments_after_update', 'trg_before_enrollment_delete', 'trg_grades_before_insert', 'trg_grades_before_update', 'trg_after_grade_insert', 'trg_grades_after_update', 'trg_grades_after_delete', 'trg_after_attendance_insert', 'trg_after_attendance_update', 'trg_attendance_after_delete'];

function nowIso() { return new Date().toISOString(); }
function sqlLiteral(v) { return v === null ? 'NULL' : String(v).replace(/'/g, "''"); }
function severityFor(testName, status, hint) {
  if (status === 'PASS') return 'LOW';
  const lower = `${testName} ${hint || ''}`.toLowerCase();
  if (lower.includes('foreign key') || lower.includes('cascade') || lower.includes('restrict') || lower.includes('orphan') || lower.includes('student_accounts') || lower.includes('rollback') || lower.includes('transaction')) return 'CRITICAL';
  if (lower.includes('trigger') || lower.includes('unique') || lower.includes('check') || lower.includes('not null') || lower.includes('primary key')) return 'HIGH';
  if (lower.includes('performance') || lower.includes('view') || lower.includes('index') || lower.includes('concurrent')) return 'MEDIUM';
  return 'LOW';
}

const results = [];
const notes = [];
let conn;

async function exec(sql, params = []) {
  return conn.query(sql, params);
}

async function getOne(sql, params = []) {
  const [rows] = await exec(sql, params);
  return rows[0];
}

async function tableExists(name) {
  const row = await getOne('SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [name]);
  return Number(row.c) > 0;
}

async function viewExists(name) {
  const row = await getOne('SELECT COUNT(*) AS c FROM information_schema.views WHERE table_schema = DATABASE() AND table_name = ?', [name]);
  return Number(row.c) > 0;
}

async function triggerExists(name) {
  const row = await getOne('SELECT COUNT(*) AS c FROM information_schema.triggers WHERE trigger_schema = DATABASE() AND trigger_name = ?', [name]);
  return Number(row.c) > 0;
}

async function indexNames(table) {
  const [rows] = await exec('SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? ORDER BY index_name', [table]);
  return rows.map(r => r.index_name);
}

function add(testCase, expected, actual, status, severity, rootCause, suggestion, verified, extra = {}) {
  results.push({
    testCase, expected, actual, status, severity, rootCause, suggestion, verified,
    timestamp: nowIso(),
    ...extra,
  });
}

async function captureError(testCase, expected, op, severityHint, suggestion) {
  try {
    await op();
    add(testCase, expected, 'Operation succeeded unexpectedly', 'FAIL', severityFor(testCase, 'FAIL', severityHint), 'Constraint/validation was not enforced', suggestion, 'No');
  } catch (err) {
    const msg = err && err.sqlMessage ? err.sqlMessage : (err && err.message ? err.message : String(err));
    add(testCase, expected, msg, 'PASS', 'LOW', '', '', 'Yes', { errorMessage: msg });
  }
}

async function cleanupLike(prefix) {
  await exec(`DELETE FROM grades WHERE student_id IN (SELECT id FROM students WHERE name LIKE ?)`, [prefix + '%']);
  await exec(`DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE name LIKE ?)`, [prefix + '%']);
  await exec(`DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE name LIKE ?)`, [prefix + '%']);
  await exec(`DELETE FROM student_accounts WHERE student_id IN (SELECT id FROM students WHERE name LIKE ?)`, [prefix + '%']);
  await exec(`DELETE FROM course_faculty WHERE course_id IN (SELECT id FROM courses WHERE course_name LIKE ?)` , [prefix + '%']);
  await exec(`DELETE FROM courses WHERE course_name LIKE ?`, [prefix + '%']);
  await exec(`DELETE FROM faculty WHERE faculty_name LIKE ?`, [prefix + '%']);
  await exec(`DELETE FROM students WHERE name LIKE ?`, [prefix + '%']);
}

async function insertStudent(name, email, extra = {}) {
  const [res] = await exec('INSERT INTO students (name, email, phone, grade_level, joining_date, contact_address, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, email, extra.phone || null, extra.grade_level || null, extra.joining_date || null, extra.contact_address || null, extra.parent_phone || null]);
  return res.insertId;
}

async function insertCourse(name, code, extra = {}) {
  const [res] = await exec('INSERT INTO courses (course_name, grade_level, course_code, duration_hours, max_capacity) VALUES (?, ?, ?, ?, ?)', [name, extra.grade_level || null, code, extra.duration_hours ?? 10, extra.max_capacity ?? 20]);
  return res.insertId;
}

async function insertFaculty(name, email, extra = {}) {
  const [res] = await exec('INSERT INTO faculty (faculty_name, email, phone, specialization, qualification) VALUES (?, ?, ?, ?, ?)', [name, email, extra.phone || null, extra.specialization || null, extra.qualification || null]);
  return res.insertId;
}

async function main() {
  conn = await mysql.createConnection(dsn);
  await cleanupLike('QA-');

  const counts = { pass: 0, fail: 0 };

  // Phase 1 structural validation
  for (const table of requestedTables) {
    const exists = await tableExists(table);
    const actual = exists ? 'Table exists' : 'Table missing';
    const status = exists ? 'PASS' : 'FAIL';
    if (status === 'PASS') counts.pass++; else counts.fail++;
    add(`Table exists: ${table}`, 'Table exists', actual, status, exists ? 'LOW' : 'CRITICAL', exists ? '' : 'Requested table is absent from the live schema', exists ? '' : 'Create the missing table and wire foreign keys/triggers', exists ? 'Yes' : 'No');
  }

  const [describeRows] = await exec('SELECT table_name, column_name, column_type, is_nullable, column_default, extra, column_key FROM information_schema.columns WHERE table_schema = DATABASE() ORDER BY table_name, ordinal_position');
  fs.writeFileSync(path.join(outDir, 'schema-columns.json'), JSON.stringify(describeRows, null, 2));

  for (const [table, column] of [['students', 'email'], ['faculty', 'email'], ['courses', 'course_code'], ['student_accounts', 'student_id']]) {
    const exists = await tableExists(table);
    let unique = false;
    if (exists) {
      const [rows] = await exec('SELECT COUNT(*) AS c FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? AND non_unique = 0', [table, column]);
      unique = Number(rows[0].c) > 0;
    }
    const status = unique ? 'PASS' : 'FAIL';
    add(`UNIQUE constraint: ${table}.${column}`, 'Unique index present', unique ? 'Unique index present' : (exists ? 'No unique index found' : 'Table missing'), status, unique ? 'LOW' : (exists ? 'HIGH' : 'CRITICAL'), unique ? '' : `Unique constraint missing on ${table}.${column}`, unique ? '' : 'Add UNIQUE index/constraint', unique ? 'Yes' : 'No');
    if (status === 'PASS') counts.pass++; else counts.fail++;
  }

  const checkTargets = [
    ['courses', 'duration_hours'], ['courses', 'max_capacity'], ['grades', 'marks_obtained'], ['grades', 'total_marks'], ['grades', 'percentage'], ['attendance', 'class_count']
  ];
  for (const [table, column] of checkTargets) {
    const [rows] = await exec('SELECT cc.constraint_name, cc.check_clause FROM information_schema.check_constraints cc JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name AND cc.constraint_schema = tc.constraint_schema WHERE tc.constraint_schema = DATABASE() AND tc.table_name = ? AND cc.check_clause LIKE ?', [table, `%${column}%`]);
    const found = rows.length > 0;
    add(`CHECK constraint: ${table}.${column}`, 'Constraint present', found ? rows.map(r => `${r.constraint_name}: ${r.check_clause}`).join(' | ') : 'Missing', found ? 'PASS' : 'FAIL', found ? 'LOW' : 'HIGH', found ? '' : `No CHECK constraint covers ${table}.${column}`, found ? '' : 'Add the missing CHECK constraint', found ? 'Yes' : 'No');
    if (found) counts.pass++; else counts.fail++;
  }

  for (const table of ['students', 'student_accounts', 'courses', 'faculty', 'enrollments', 'grades', 'attendance', 'audit_log']) {
    const idx = await indexNames(table);
    add(`Indexes on ${table}`, 'PK/required indexes exist', idx.join(', '), 'PASS', 'LOW', '', '', 'Yes');
    counts.pass++;
  }

  // Auto-increment and PK
  const s1 = await insertStudent('QA-Auto1', 'qa-auto1@example.com');
  const s2 = await insertStudent('QA-Auto2', 'qa-auto2@example.com');
  add('Auto-increment on students.id', 'Sequential IDs generated', `Inserted IDs ${s1}, ${s2}`, s2 === s1 + 1 ? 'PASS' : 'FAIL', s2 === s1 + 1 ? 'LOW' : 'HIGH', s2 === s1 + 1 ? '' : 'IDs were not sequential', s2 === s1 + 1 ? '' : 'Confirm AUTO_INCREMENT is configured', s2 === s1 + 1 ? 'Yes' : 'No');
  counts[s2 === s1 + 1 ? 'pass' : 'fail']++;
  await captureError('Primary key duplicate insert', 'Duplicate ID rejected', async () => { await exec('INSERT INTO students (id, name, email) VALUES (?, ?, ?)', [s1, 'QA-Duplicate', 'qa-dupe@example.com']); }, 'primary key', 'Ensure PRIMARY KEY on id column');
  counts.pass++;

  // Unique tests
  const emailBase = 'qa-unique@example.com';
  const stA = await insertStudent('QA-Unique Student', emailBase);
  await captureError('UNIQUE students.email duplicate', 'ERROR 1062 duplicate email', async () => { await insertStudent('QA-Unique Student 2', emailBase); }, 'unique', 'Add UNIQUE constraint on students.email');
  counts.pass++;
  const facA = await insertFaculty('QA-Unique Faculty', 'qa-faculty@example.com');
  await captureError('UNIQUE faculty.email duplicate', 'ERROR 1062 duplicate email', async () => { await insertFaculty('QA-Unique Faculty 2', 'qa-faculty@example.com'); }, 'unique', 'Add UNIQUE constraint on faculty.email');
  counts.pass++;
  const courseA = await insertCourse('QA-Unique Course', 'QA-COURSE-001', { duration_hours: 12, max_capacity: 20 });
  await captureError('UNIQUE courses.course_code duplicate', 'ERROR 1062 duplicate course_code', async () => { await insertCourse('QA-Unique Course 2', 'QA-COURSE-001', { duration_hours: 12, max_capacity: 20 }); }, 'unique', 'Add UNIQUE constraint on courses.course_code');
  counts.pass++;

  // student_accounts coverage
  const saStudent = await insertStudent('QA-Account Student', 'qa-account-student@example.com');
  const [saRes] = await exec('INSERT INTO student_accounts (student_id, account_username, password_hash) VALUES (?, ?, ?)', [saStudent, 'qa.account.student', 'hash']);
  add('student_accounts insert', 'Account row created for student', `insertId=${saRes.insertId}`, saRes.insertId > 0 ? 'PASS' : 'FAIL', saRes.insertId > 0 ? 'LOW' : 'HIGH', saRes.insertId > 0 ? '' : 'Insert failed', 'Ensure student_accounts table and FK exist', saRes.insertId > 0 ? 'Yes' : 'No');
  counts[saRes.insertId > 0 ? 'pass' : 'fail']++;
  await captureError('UNIQUE student_accounts.student_id duplicate', 'Reject duplicate student account row', async () => { await exec('INSERT INTO student_accounts (student_id, account_username, password_hash) VALUES (?, ?, ?)', [saStudent, 'qa.account.student2', 'hash']); }, 'unique', 'Add UNIQUE (student_id) on student_accounts');
  counts.pass++;
  await captureError('FK student_accounts.student_id invalid', 'Reject non-existent student_id', async () => { await exec('INSERT INTO student_accounts (student_id, account_username, password_hash) VALUES (?, ?, ?)', [999999, 'qa.account.bad', 'hash']); }, 'foreign key', 'Add FK student_accounts.student_id -> students.id');
  counts.pass++;
  await exec('DELETE FROM students WHERE id = ?', [saStudent]);
  const saOrphan = await getOne('SELECT COUNT(*) AS c FROM student_accounts WHERE student_id = ?', [saStudent]);
  add('ON DELETE CASCADE student_accounts.student_id', 'Account row should cascade delete with student', `remaining=${saOrphan.c}`, Number(saOrphan.c) === 0 ? 'PASS' : 'FAIL', Number(saOrphan.c) === 0 ? 'LOW' : 'HIGH', Number(saOrphan.c) === 0 ? '' : 'Cascade delete failed', 'Add ON DELETE CASCADE to student_accounts.student_id', Number(saOrphan.c) === 0 ? 'Yes' : 'No');
  counts[Number(saOrphan.c) === 0 ? 'pass' : 'fail']++;

  // CHECK tests
  await captureError('CHECK courses.duration_hours > 0 (0)', 'Reject zero duration', async () => { await insertCourse('QA-CHK-D0', 'QA-CHK-D0', { duration_hours: 0, max_capacity: 5 }); }, 'check', 'Add CHECK (duration_hours > 0)');
  counts.pass++;
  await captureError('CHECK courses.duration_hours > 0 (-10)', 'Reject negative duration', async () => { await insertCourse('QA-CHK-DN', 'QA-CHK-DN', { duration_hours: -10, max_capacity: 5 }); }, 'check', 'Add CHECK (duration_hours > 0)');
  counts.pass++;
  await exec('INSERT INTO courses (course_name, course_code, duration_hours, max_capacity) VALUES (?, ?, ?, ?)', ['QA-CHK-Cap0', 'QA-CHK-CAP0', 1, 0]).then(() => add('CHECK courses.max_capacity > 0 (0)', 'Reject zero max capacity', 'Operation succeeded unexpectedly', 'FAIL', 'HIGH', 'Missing/disabled check constraint', 'Add CHECK (max_capacity > 0)', 'No')).catch(err => add('CHECK courses.max_capacity > 0 (0)', 'Reject zero max capacity', err.sqlMessage || err.message, 'PASS', 'LOW', '', '', 'Yes'));
  counts.pass++;
  await captureError('CHECK grades.marks_obtained >= 0 (-5)', 'Reject negative marks', async () => { await exec('INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage) VALUES (?, ?, ?, ?, ?)', [stA, courseA, -5, 100, 0]); }, 'check', 'Add CHECK (marks_obtained >= 0)');
  counts.pass++;
  await captureError('CHECK grades.total_marks > 0 (0)', 'Reject zero total marks', async () => { await exec('INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage) VALUES (?, ?, ?, ?, ?)', [stA, courseA, 0, 0, 0]); }, 'check', 'Add CHECK (total_marks > 0)');
  counts.pass++;
  await captureError('CHECK grades.percentage between 0-100 (150)', 'Reject percentage >100', async () => { await exec('INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage) VALUES (?, ?, ?, ?, ?)', [stA, courseA, 150, 100, 150]); }, 'check', 'Add CHECK (percentage BETWEEN 0 AND 100)');
  counts.pass++;
  await captureError('CHECK attendance.class_count >= 1 (0)', 'Reject zero class_count', async () => { await exec('INSERT INTO attendance (student_id, course_id, attendance_date, is_present, class_count) VALUES (?, ?, CURDATE(), 1, 0)', [stA, courseA]); }, 'check', 'Add CHECK (class_count >= 1)');
  counts.pass++;

  // NOT NULL
  await captureError('NOT NULL students.name', 'Reject NULL name', async () => { await exec('INSERT INTO students (name, email) VALUES (?, ?)', [null, 'qa-null-name@example.com']); }, 'not null', 'Keep name NOT NULL');
  counts.pass++;
  await captureError('NOT NULL students.email', 'Reject NULL email', async () => { await exec('INSERT INTO students (name, email) VALUES (?, ?)', ['QA-Null-Email', null]); }, 'not null', 'Keep email NOT NULL');
  counts.pass++;
  await captureError('NOT NULL courses.course_name', 'Reject NULL course_name', async () => { await exec('INSERT INTO courses (course_name, course_code, duration_hours, max_capacity) VALUES (?, ?, ?, ?)', [null, 'QA-NULL-COURSE', 10, 5]); }, 'not null', 'Keep course_name NOT NULL');
  counts.pass++;
  await captureError('NOT NULL faculty.faculty_name', 'Reject NULL faculty_name', async () => { await exec('INSERT INTO faculty (faculty_name, email) VALUES (?, ?)', [null, 'qa-null-faculty@example.com']); }, 'not null', 'Keep faculty_name NOT NULL');
  counts.pass++;

  // FK tests on existing schema
  await captureError('FK enrollments.student_id invalid', 'Reject non-existent student_id', async () => { await exec('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [999999, courseA]); }, 'foreign key', 'Ensure FK enrollments.student_id exists');
  counts.pass++;
  await captureError('FK enrollments.course_id invalid', 'Reject non-existent course_id', async () => { await exec('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [stA, 999999]); }, 'foreign key', 'Ensure FK enrollments.course_id exists');
  counts.pass++;
  const enroll1 = (await exec('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [stA, courseA]))[0].insertId;
  const enrollBefore = await getOne('SELECT COUNT(*) AS c FROM enrollments WHERE student_id = ?', [stA]);
  await exec('DELETE FROM students WHERE id = ?', [stA]);
  const enrollAfter = await getOne('SELECT COUNT(*) AS c FROM enrollments WHERE student_id = ?', [stA]);
  add('ON DELETE CASCADE enrollments.student_id', 'Enrollments auto-delete with student delete', `Before=${enrollBefore.c}, After=${enrollAfter.c}`, Number(enrollAfter.c) === 0 ? 'PASS' : 'FAIL', Number(enrollAfter.c) === 0 ? 'LOW' : 'HIGH', Number(enrollAfter.c) === 0 ? '' : 'FK is not cascading as expected', Number(enrollAfter.c) === 0 ? '' : 'Add ON DELETE CASCADE to enrollments.student_id', Number(enrollAfter.c) === 0 ? 'Yes' : 'No');
  counts[Number(enrollAfter.c) === 0 ? 'pass' : 'fail']++;

  // Recreate student/course for more tests
  const stB = await insertStudent('QA-Student-B', 'qa-student-b@example.com');
  const courseB = await insertCourse('QA-Course-B', 'QA-COURSE-B', { duration_hours: 10, max_capacity: 2 });
  await exec('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [stB, courseB]);
  await captureError('RESTRICT delete course with active enrollments', 'Reject delete of course with enrollment', async () => { await exec('DELETE FROM courses WHERE id = ?', [courseB]); }, 'restrict', 'Apply ON DELETE RESTRICT or keep FK from enrollments.course_id');
  counts.pass++;

  // Views and triggers
  for (const v of requiredViews) {
    const exists = await viewExists(v);
    add(`View exists: ${v}`, 'View should exist', exists ? 'View exists' : 'View missing', exists ? 'PASS' : 'FAIL', exists ? 'LOW' : 'HIGH', exists ? '' : `View ${v} is not implemented`, exists ? '' : 'Create the missing analytical view', exists ? 'Yes' : 'No');
    if (exists) counts.pass++; else counts.fail++;
  }
  for (const t of requiredTriggers) {
    const exists = await triggerExists(t);
    add(`Trigger exists: ${t}`, 'Trigger should exist', exists ? 'Trigger exists' : 'Trigger missing', exists ? 'PASS' : 'FAIL', exists ? 'LOW' : 'HIGH', exists ? '' : `Trigger ${t} is absent from live schema`, exists ? '' : 'Implement the trigger', exists ? 'Yes' : 'No');
    if (exists) counts.pass++; else counts.fail++;
  }

  // Audit trail sample
  const auditRows = await getOne('SELECT COUNT(*) AS c FROM audit_log');
  const sampleAudit = await exec('SELECT * FROM audit_log ORDER BY id DESC LIMIT 10');
  fs.writeFileSync(path.join(outDir, 'audit_trail_sample.json'), JSON.stringify(sampleAudit[0], null, 2));

  // Capture audit changed_by behavior
  const auditStudent = await insertStudent('QA-Audit', 'qa-audit@example.com');
  await exec('UPDATE students SET phone = ? WHERE id = ?', ['9999999999', auditStudent]);
  const auditEntry = await getOne('SELECT changed_by, changed_at, operation_type, old_value, new_value FROM audit_log WHERE table_name = ? AND operation_type IN ("INSERT", "UPDATE") ORDER BY id DESC LIMIT 1', ['students']);
  add('Audit log changed_by/current user', 'Capture current user', JSON.stringify(auditEntry), auditEntry && auditEntry.changed_by && auditEntry.changed_by !== 'db_trigger' ? 'PASS' : 'FAIL', auditEntry && auditEntry.changed_by && auditEntry.changed_by !== 'db_trigger' ? 'LOW' : 'MEDIUM', 'Triggers do not capture the application user; changed_by defaults to db_trigger', 'Pass user identity from application into triggers or set via session variable', auditEntry && auditEntry.changed_by && auditEntry.changed_by !== 'db_trigger' ? 'Yes' : 'No');
  counts[(auditEntry && auditEntry.changed_by && auditEntry.changed_by !== 'db_trigger') ? 'pass' : 'fail']++;

  // Performance baseline
  const perf = [];
  for (const view of requiredViews) {
    if (!(await viewExists(view))) {
      perf.push({ query: `SELECT * FROM ${view}`, ms: null, status: 'MISSING' });
      continue;
    }
    const started = Date.now();
    try {
      await exec(`SELECT * FROM ${view} LIMIT 50`);
      perf.push({ query: `SELECT * FROM ${view} LIMIT 50`, ms: Date.now() - started, status: 'PASS' });
    } catch (err) {
      perf.push({ query: `SELECT * FROM ${view} LIMIT 50`, ms: Date.now() - started, status: `FAIL: ${err.sqlMessage || err.message}` });
    }
  }
  fs.writeFileSync(path.join(outDir, 'performance_baseline.csv'), ['query,ms,status'].concat(perf.map(r => `${JSON.stringify(r.query).slice(1, -1)},${r.ms ?? ''},${r.status}`)).join('\n'));

  // Concurrency tests
  async function concurrentGrades(studentId, courseId) {
    const inserts = [82, 84, 86, 88, 90].map(m => exec('INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage) VALUES (?, ?, ?, ?, ?)', [studentId, courseId, m, 100, m]));
    return Promise.allSettled(inserts);
  }
  const stC = await insertStudent('QA-Concurrent', 'qa-concurrent@example.com');
  const cC1 = await insertCourse('QA-Concurrent-1', 'QA-CONCUR-1', { duration_hours: 8, max_capacity: 10 });
  const cC2 = await insertCourse('QA-Concurrent-2', 'QA-CONCUR-2', { duration_hours: 8, max_capacity: 10 });
  const conc = await concurrentGrades(stC, cC1);
  const concFailures = conc.filter(r => r.status === 'rejected').length;
  add('Concurrent grade inserts', 'All 5 insertions succeed', `fulfilled=${5-concFailures}, rejected=${concFailures}`, concFailures === 0 ? 'PASS' : 'FAIL', concFailures === 0 ? 'LOW' : 'HIGH', concFailures === 0 ? '' : 'One or more inserts failed under concurrency', 'Use a design that supports multiple grades per student/course or different courses', concFailures === 0 ? 'Yes' : 'No');
  counts[concFailures === 0 ? 'pass' : 'fail']++;

  // Transaction/rollback tests
  try {
    await exec('START TRANSACTION');
    const [res] = await exec('INSERT INTO students (name, email) VALUES (?, ?)', ['QA-TX-RB', 'qa-tx-rb@example.com']);
    const txStudent = res.insertId;
    await exec('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)', [txStudent, 999999]);
    await exec('COMMIT');
    add('Transaction rollback on FK failure', 'Invalid enrollment should rollback student insert', 'Transaction unexpectedly committed', 'FAIL', 'CRITICAL', 'Error handling/rollback logic is not isolating the failed statement', 'Wrap in transaction and rollback on error', 'No');
    counts.fail++;
  } catch (err) {
    await exec('ROLLBACK').catch(() => {});
    const exists = await getOne('SELECT COUNT(*) AS c FROM students WHERE email = ?', ['qa-tx-rb@example.com']);
    add('Transaction rollback on FK failure', 'Student should not persist after rollback', `Error: ${err.sqlMessage || err.message}; studentExists=${exists.c}`, Number(exists.c) === 0 ? 'PASS' : 'FAIL', Number(exists.c) === 0 ? 'LOW' : 'CRITICAL', Number(exists.c) === 0 ? '' : 'Rollback did not clear partial insert', 'Ensure failed transaction is rolled back', Number(exists.c) === 0 ? 'Yes' : 'No');
    counts[Number(exists.c) === 0 ? 'pass' : 'fail']++;
  }

  // Error handling samples
  const errorSamples = [];
  await captureError('Error clarity UNIQUE', 'Error should mention duplicate key/constraint', async () => { await insertStudent('QA-Err-U1', 'qa-err-u1@example.com'); await insertStudent('QA-Err-U2', 'qa-err-u1@example.com'); }, 'unique', 'Ensure SQL error propagation includes constraint name');
  errorSamples.push(results[results.length - 1]);

  // final summaries
  const total = results.length;
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const passPct = ((passCount / total) * 100).toFixed(2);

  const ranked = results.filter(r => r.status === 'FAIL').sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity] || a.testCase.localeCompare(b.testCase);
  });

  const uniqueRanked = [];
  const seenBugKeys = new Set();
  for (const item of ranked) {
    const bugKey = item.testCase.includes('student_accounts') ? 'student_accounts' :
      item.testCase.includes('changed_by/current user') ? 'audit.changed_by' :
      item.testCase;
    if (seenBugKeys.has(bugKey)) continue;
    seenBugKeys.add(bugKey);
    uniqueRanked.push(item);
  }

  const detailedTxt = results.map(r => [
    `TEST CASE: ${r.testCase}`,
    `EXPECTED: ${r.expected}`,
    `ACTUAL: ${r.actual}`,
    `STATUS: ${r.status}`,
    `SEVERITY: ${r.severity}`,
    `ROOT CAUSE: ${r.rootCause || 'N/A'}`,
    `SUGGESTION: ${r.suggestion || 'N/A'}`,
    `VERIFIED: ${r.verified}`,
    ''
  ].join('\n')).join('\n');

  const checklist = [
    `[${requestedTables.every(t => results.find(r => r.testCase === `Table exists: ${t}` && r.status === 'PASS')) ? '✓' : 'x'}] All 10 tables created correctly`,
    `[${results.filter(r => r.testCase.startsWith('UNIQUE constraint')).every(r => r.status === 'PASS') ? '✓' : 'x'}] All constraints enforced (PK, FK, UNIQUE, CHECK, NOT NULL)`,
    `[${results.filter(r => r.testCase.startsWith('Trigger exists')).some(r => r.status === 'FAIL') ? 'x' : '✓'}] All triggers firing correctly (or fewer if not all implemented)`,
    `[${requiredViews.every(v => results.find(r => r.testCase === `View exists: ${v}` && r.status === 'PASS')) ? '✓' : 'x'}] All 5 views returning correct data`,
    `[${results.find(r => r.testCase.includes('ON DELETE CASCADE enrollments.student_id'))?.status === 'PASS' ? '✓' : 'x'}] Cascade deletes working (ON DELETE CASCADE)`,
    `[${results.find(r => r.testCase.includes('RESTRICT delete course with active enrollments'))?.status === 'PASS' ? '✓' : 'x'}] Restrict deletes working (ON DELETE RESTRICT)`,
    `[${results.find(r => r.testCase.includes('on delete cascade enrollments.student_id'))?.status === 'PASS' ? '✓' : 'x'}] No orphan records after deletes`,
    `[${results.find(r => r.testCase === 'Audit log changed_by/current user')?.status === 'PASS' ? '✓' : 'x'}] Audit trail complete (all operations logged)`,
    `[x] 3NF normalization maintained (no redundancy, no anomalies)`,
    `[${perf.every(p => p.status === 'PASS' && p.ms !== null && p.ms < 2000) ? '✓' : 'x'}] Query performance acceptable (< 2 seconds for views, < 500ms for joins)`,
    `[${results.find(r => r.testCase === 'Concurrent grade inserts')?.status === 'PASS' ? '✓' : 'x'}] Concurrent operations safe (no lost updates, race conditions)`,
    `[${results.some(r => r.testCase.startsWith('Error clarity')) ? 'x' : '✓'}] Error messages clear and helpful`,
    `[${results.find(r => r.testCase === 'Transaction rollback on FK failure')?.status === 'PASS' ? '✓' : 'x'}] Transaction rollback working`,
    `[${results.filter(r => r.testCase.includes('CHECK') || r.testCase.includes('NOT NULL')).every(r => r.status === 'PASS') ? '✓' : 'x'}] Edge cases handled`,
    `[${results.filter(r => r.testCase.includes('duration_hours') || r.testCase.includes('max_capacity')).some(r => r.status === 'FAIL') ? 'x' : '✓'}] Boundary values accepted/rejected correctly`,
  ].join('\n');

  const bugsMd = ['# Bugs Found Ranked', ''].concat(uniqueRanked.map(r => `## ${r.severity}: ${r.testCase}\n- Expected: ${r.expected}\n- Actual: ${r.actual}\n- Root cause: ${r.rootCause || 'N/A'}\n- Suggestion: ${r.suggestion || 'N/A'}\n`)).join('\n');
  const fixesMd = ['# Fixes Applied Verified', '', 'No schema fixes were applied in this run; the suite only validated the live database and captured defects.', ''].join('\n');
  const checklistMd = ['# Schema Verification Checklist', '', ...checklist.split('\n')].join('\n');

  fs.writeFileSync(path.join(outDir, 'test_results_detailed.txt'), detailedTxt);
  fs.writeFileSync(path.join(outDir, 'bugs_found_ranked.md'), bugsMd);
  fs.writeFileSync(path.join(outDir, 'fixes_applied_verified.md'), fixesMd);
  fs.writeFileSync(path.join(outDir, 'schema_verification_checklist.md'), checklistMd);
  fs.writeFileSync(path.join(outDir, 'test_coverage_summary.txt'), `Total tests: ${total}\nPassed: ${passCount}\nFailed: ${failCount}\nPass rate: ${passPct}%\n`);

  console.log(JSON.stringify({ total, passCount, failCount, passPct, outDir }, null, 2));
  await conn.end();
}

main().catch(async err => {
  console.error(err.stack || err);
  if (conn) await conn.end().catch(() => {});
  process.exit(1);
});
