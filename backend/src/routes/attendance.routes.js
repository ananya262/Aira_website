const express = require('express');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/attendance.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, asyncHandler(controller.list));
router.get('/:student_id/:course_id', authenticate, asyncHandler(controller.getByStudentCourse));
router.post('/', authenticate, requireRole('admin', 'faculty'), asyncHandler(controller.bulkCreate));
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(controller.remove));

module.exports = router;
