const { pool } = require('../config/db');
const { ok } = require('../utils/response');

const views = {
  studentPerformance: 'v_student_performance',
  courseUtilization: 'v_course_utilization',
  facultyWorkload: 'v_faculty_workload',
  attendanceSummary: 'v_attendance_summary'
};

function viewController(viewName) {
  return async function getView(req, res) {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const [rows] = await pool.query(`SELECT * FROM ${viewName} LIMIT ?`, [limit]);
    return ok(res, rows, 'Dashboard data fetched');
  };
}

module.exports = {
  studentPerformance: viewController(views.studentPerformance),
  courseUtilization: viewController(views.courseUtilization),
  facultyWorkload: viewController(views.facultyWorkload),
  attendanceSummary: viewController(views.attendanceSummary)
};
