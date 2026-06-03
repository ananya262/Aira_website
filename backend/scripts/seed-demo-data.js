require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const demoPassword = 'Demo@1234';

const students = [
  {
    name: 'Aanya Verma',
    email: 'aanya.verma@aira.demo',
    phone: '9876500011',
    grade_level: 'Grade 10',
    joining_date: '2025-04-10',
    contact_address: 'Rosewood Apartments, Sector 12, Pune',
    parent_phone: '9876501011',
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@aira.demo',
    phone: '9876500012',
    grade_level: 'Grade 9',
    joining_date: '2025-06-15',
    contact_address: 'Saffron Heights, Andheri West, Mumbai',
    parent_phone: '9876501012',
  },
  {
    name: 'Isha Nair',
    email: 'isha.nair@aira.demo',
    phone: '9876500013',
    grade_level: 'Grade 8',
    joining_date: '2025-05-20',
    contact_address: 'Palm Grove, Kakkanad, Kochi',
    parent_phone: '9876501013',
  },
  {
    name: 'Arjun Rao',
    email: 'arjun.rao@aira.demo',
    phone: '9876500014',
    grade_level: 'Grade 10',
    joining_date: '2025-03-18',
    contact_address: 'Lakeview Residency, Indiranagar, Bengaluru',
    parent_phone: '9876501014',
  },
  {
    name: 'Sana Khan',
    email: 'sana.khan@aira.demo',
    phone: '9876500015',
    grade_level: 'Grade 7',
    joining_date: '2025-07-01',
    contact_address: 'Green Meadows, Bhopal',
    parent_phone: '9876501015',
  },
  {
    name: 'Vedant Sharma',
    email: 'vedant.sharma@aira.demo',
    phone: '9876500016',
    grade_level: 'Grade 9',
    joining_date: '2025-08-09',
    contact_address: 'Shivaji Nagar, Jaipur',
    parent_phone: '9876501016',
  },
  {
    name: 'Meera Iyer',
    email: 'meera.iyer@aira.demo',
    phone: '9876500017',
    grade_level: 'Grade 8',
    joining_date: '2025-04-28',
    contact_address: 'Coconut Bay Apartments, Chennai',
    parent_phone: '9876501017',
  },
  {
    name: 'Kabir Sethi',
    email: 'kabir.sethi@aira.demo',
    phone: '9876500018',
    grade_level: 'Grade 7',
    joining_date: '2025-09-11',
    contact_address: 'Hillcrest Colony, Delhi',
    parent_phone: '9876501018',
  },
];

const faculty = [
  {
    faculty_name: 'Dr. Priya Menon',
    email: 'priya.menon@aira.demo',
    phone: '9811100011',
    specialization: 'Mathematics',
    qualification: 'PhD in Mathematics Education',
  },
  {
    faculty_name: 'Ritesh Malhotra',
    email: 'ritesh.malhotra@aira.demo',
    phone: '9811100012',
    specialization: 'Physics',
    qualification: 'M.Sc Physics, B.Ed',
  },
  {
    faculty_name: 'Sonia Dsouza',
    email: 'sonia.dsouza@aira.demo',
    phone: '9811100013',
    specialization: 'Chemistry',
    qualification: 'M.Sc Chemistry, CBSE Trainer',
  },
];

const courses = [
  { course_name: 'Foundation Maths', grade_level: 'Grade 7', course_code: 'MTH-701', duration_hours: 48, max_capacity: 12 },
  { course_name: 'Science Explorer', grade_level: 'Grade 8', course_code: 'SCI-801', duration_hours: 54, max_capacity: 12 },
  { course_name: 'Algebra and Geometry', grade_level: 'Grade 9', course_code: 'MTH-901', duration_hours: 60, max_capacity: 10 },
  { course_name: 'Board Mastery Bootcamp', grade_level: 'Grade 10', course_code: 'SCI-1001', duration_hours: 72, max_capacity: 10 },
];

const appUsers = [
  { username: 'admin', password: 'admin123', role: 'admin' },
];

function usernameFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
}

async function hash(password) {
  return bcrypt.hash(password, 10);
}

async function truncateAll() {
  const tables = [
    'audit_log',
    'app_users',
    'student_accounts',
    'attendance',
    'grades',
    'enrollments',
    'course_faculty',
    'student_statistics',
    'faculty',
    'courses',
    'students',
  ];

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function insertStudent(student) {
  const [result] = await pool.query(
    `INSERT INTO students (name, email, phone, grade_level, joining_date, contact_address, parent_phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [student.name, student.email, student.phone, student.grade_level, student.joining_date, student.contact_address, student.parent_phone]
  );
  return result.insertId;
}

async function insertFaculty(member) {
  const [result] = await pool.query(
    `INSERT INTO faculty (faculty_name, email, phone, specialization, qualification)
     VALUES (?, ?, ?, ?, ?)`,
    [member.faculty_name, member.email, member.phone, member.specialization, member.qualification]
  );
  return result.insertId;
}

async function insertCourse(course) {
  const [result] = await pool.query(
    `INSERT INTO courses (course_name, grade_level, course_code, duration_hours, max_capacity)
     VALUES (?, ?, ?, ?, ?)`,
    [course.course_name, course.grade_level, course.course_code, course.duration_hours, course.max_capacity]
  );
  return result.insertId;
}

async function main() {
  await truncateAll();

  const studentIds = [];
  for (const student of students) {
    studentIds.push(await insertStudent(student));
  }

  const facultyIds = [];
  for (const member of faculty) {
    facultyIds.push(await insertFaculty(member));
  }

  const courseIds = [];
  for (const course of courses) {
    courseIds.push(await insertCourse(course));
  }

  const studentLookup = Object.fromEntries(students.map((student, index) => [student.name, studentIds[index]]));
  const facultyLookup = Object.fromEntries(faculty.map((member, index) => [member.faculty_name, facultyIds[index]]));
  const courseLookup = Object.fromEntries(courses.map((course, index) => [course.course_code, courseIds[index]]));

  const demoStudentAccounts = students.map((student) => ({
    student_id: studentLookup[student.name],
    account_username: usernameFromName(student.name),
  }));

  for (const account of demoStudentAccounts) {
    const passwordHash = await hash(demoPassword);
    await pool.query(
      `INSERT INTO student_accounts (student_id, account_username, password_hash, account_status)
       VALUES (?, ?, ?, 'active')`,
      [account.student_id, account.account_username, passwordHash]
    );
  }

  const adminPasswordHash = await hash('admin123');
  await pool.query(
    `INSERT INTO app_users (username, password_hash, role)
     VALUES (?, ?, 'admin')`,
    ['admin', adminPasswordHash]
  );

  const facultyUsers = [
    { username: 'faculty', password: 'faculty123', role: 'faculty', faculty_id: facultyLookup['Dr. Priya Menon'] },
    { username: 'science.faculty', password: 'science123', role: 'faculty', faculty_id: facultyLookup['Ritesh Malhotra'] },
    { username: 'chem.faculty', password: 'chem123', role: 'faculty', faculty_id: facultyLookup['Sonia Dsouza'] },
  ];

  for (const user of facultyUsers) {
    const passwordHash = await hash(user.password);
    await pool.query(
      `INSERT INTO app_users (username, password_hash, role, faculty_id)
       VALUES (?, ?, ?, ?)`,
      [user.username, passwordHash, user.role, user.faculty_id]
    );
  }

  const studentUsers = [
    { username: 'student', password: 'student123', student_id: studentLookup['Aanya Verma'] },
    { username: 'rohan.student', password: 'student123', student_id: studentLookup['Rohan Mehta'] },
    { username: 'isha.student', password: 'student123', student_id: studentLookup['Isha Nair'] },
  ];

  for (const user of studentUsers) {
    const passwordHash = await hash(user.password);
    await pool.query(
      `INSERT INTO app_users (username, password_hash, role, student_id)
       VALUES (?, ?, 'student', ?)`,
      [user.username, passwordHash, user.student_id]
    );
  }

  await pool.query(
    `INSERT INTO course_faculty (course_id, faculty_id, assigned_date) VALUES
      (?, ?, '2025-04-01'),
      (?, ?, '2025-04-01'),
      (?, ?, '2025-04-01'),
      (?, ?, '2025-04-01')`,
    [
      courseLookup['MTH-701'], facultyLookup['Dr. Priya Menon'],
      courseLookup['SCI-801'], facultyLookup['Ritesh Malhotra'],
      courseLookup['MTH-901'], facultyLookup['Dr. Priya Menon'],
      courseLookup['SCI-1001'], facultyLookup['Sonia Dsouza'],
    ]
  );

  const enrollmentRows = [
    ['Aanya Verma', 'MTH-901', 'active'],
    ['Aanya Verma', 'SCI-1001', 'active'],
    ['Rohan Mehta', 'MTH-901', 'active'],
    ['Rohan Mehta', 'SCI-1001', 'active'],
    ['Isha Nair', 'SCI-801', 'active'],
    ['Arjun Rao', 'MTH-901', 'active'],
    ['Sana Khan', 'MTH-701', 'active'],
    ['Vedant Sharma', 'SCI-801', 'active'],
    ['Meera Iyer', 'SCI-801', 'active'],
    ['Kabir Sethi', 'MTH-701', 'active'],
  ];

  for (const [studentName, courseCode, status] of enrollmentRows) {
    await pool.query(
      `INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
       VALUES (?, ?, ?, ?)`,
      [studentLookup[studentName], courseLookup[courseCode], '2025-04-15', status]
    );
  }

  const gradeRows = [
    ['Aanya Verma', 'MTH-901', 88, 100, '2026-03-10'],
    ['Aanya Verma', 'SCI-1001', 91, 100, '2026-03-18'],
    ['Rohan Mehta', 'MTH-901', 79, 100, '2026-03-10'],
    ['Rohan Mehta', 'SCI-1001', 83, 100, '2026-03-18'],
    ['Isha Nair', 'SCI-801', 87, 100, '2026-03-12'],
    ['Arjun Rao', 'MTH-901', 94, 100, '2026-03-10'],
    ['Sana Khan', 'MTH-701', 76, 100, '2026-03-08'],
    ['Vedant Sharma', 'SCI-801', 85, 100, '2026-03-12'],
    ['Meera Iyer', 'SCI-801', 90, 100, '2026-03-12'],
    ['Kabir Sethi', 'MTH-701', 81, 100, '2026-03-08'],
  ];

  for (const [studentName, courseCode, marks, total, recorded] of gradeRows) {
    const percentage = Math.round((marks / total) * 10000) / 100;
    await pool.query(
      `INSERT INTO grades (student_id, course_id, marks_obtained, total_marks, percentage, date_recorded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentLookup[studentName], courseLookup[courseCode], marks, total, percentage, recorded]
    );
  }

  const attendanceRows = [
    ['Aanya Verma', 'MTH-901', '2026-03-04', 1, 1],
    ['Aanya Verma', 'SCI-1001', '2026-03-11', 1, 1],
    ['Rohan Mehta', 'MTH-901', '2026-03-04', 1, 1],
    ['Rohan Mehta', 'SCI-1001', '2026-03-11', 0, 1],
    ['Isha Nair', 'SCI-801', '2026-03-05', 1, 1],
    ['Arjun Rao', 'MTH-901', '2026-03-04', 1, 1],
    ['Sana Khan', 'MTH-701', '2026-03-06', 1, 1],
    ['Vedant Sharma', 'SCI-801', '2026-03-05', 1, 1],
    ['Meera Iyer', 'SCI-801', '2026-03-05', 1, 1],
    ['Kabir Sethi', 'MTH-701', '2026-03-06', 0, 1],
  ];

  for (const [studentName, courseCode, attendanceDate, isPresent, classCount] of attendanceRows) {
    await pool.query(
      `INSERT INTO attendance (student_id, course_id, attendance_date, is_present, class_count)
       VALUES (?, ?, ?, ?, ?)`,
      [studentLookup[studentName], courseLookup[courseCode], attendanceDate, isPresent, classCount]
    );
  }

  for (const studentId of studentIds) {
    await pool.query('CALL sp_refresh_student_statistics(?)', [studentId]);
  }

  const summaryTables = ['students', 'student_accounts', 'courses', 'faculty', 'enrollments', 'grades', 'attendance', 'student_statistics', 'app_users'];
  for (const table of summaryTables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM ${table}`);
    console.log(`${table}: ${rows[0].total}`);
  }

  console.log('Demo database refreshed successfully.');
  console.log(`Student account password: ${demoPassword}`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});