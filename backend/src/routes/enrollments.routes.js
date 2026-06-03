const express = require('express');
const asyncHandler = require('../utils/async-handler');
const controller = require('../controllers/enrollments.controller');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, asyncHandler(controller.list));
router.get('/:id', authenticate, asyncHandler(controller.get));
router.post('/', authenticate, requireRole('admin'), asyncHandler(controller.create));
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(controller.update));
router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(controller.remove));

module.exports = router;
