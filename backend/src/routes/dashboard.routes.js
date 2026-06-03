const express = require('express');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/student-performance', authenticate, asyncHandler(controller.studentPerformance));
router.get('/course-utilization', authenticate, asyncHandler(controller.courseUtilization));
router.get('/faculty-workload', authenticate, asyncHandler(controller.facultyWorkload));
router.get('/attendance-summary', authenticate, asyncHandler(controller.attendanceSummary));

module.exports = router;
