const express = require('express');
const asyncHandler = require('../utils/async-handler');
const crudController = require('../controllers/crud.controller');
const { createCrudService } = require('../services/db-service');
const { authenticate, requireRole } = require('../middleware/auth');

const definitions = {
  students: {
    table: 'students',
    columns: ['name', 'email', 'phone', 'grade_level', 'joining_date', 'contact_address', 'parent_phone'],
    required: ['name', 'email'],
    searchColumns: ['name', 'email', 'phone'],
    sortColumns: ['id', 'name', 'email', 'joining_date', 'created_at'],
    dateField: 'joining_date',
    roles: ['admin']
  },
  courses: {
    table: 'courses',
    columns: ['course_name', 'grade_level', 'course_code', 'duration_hours', 'max_capacity'],
    required: ['course_name', 'course_code', 'duration_hours', 'max_capacity'],
    searchColumns: ['course_name', 'course_code', 'grade_level'],
    sortColumns: ['id', 'course_name', 'course_code', 'created_at'],
    dateField: 'created_at',
    roles: ['admin']
  },
  faculty: {
    table: 'faculty',
    columns: ['faculty_name', 'email', 'phone', 'specialization', 'qualification'],
    required: ['faculty_name', 'email'],
    searchColumns: ['faculty_name', 'email', 'specialization'],
    sortColumns: ['id', 'faculty_name', 'email', 'created_at'],
    dateField: 'created_at',
    roles: ['admin']
  },
  courseFaculty: {
    table: 'course_faculty',
    columns: ['course_id', 'faculty_id', 'assigned_date'],
    required: ['course_id', 'faculty_id'],
    searchColumns: [],
    sortColumns: ['id', 'course_id', 'faculty_id', 'assigned_date'],
    dateField: 'assigned_date',
    roles: ['admin']
  }
};

function makeCrudRouter(key) {
  const definition = definitions[key];
  const service = createCrudService(definition.table, definition.columns, definition.required);
  const controller = crudController(service, {
    searchColumns: definition.searchColumns,
    sortColumns: definition.sortColumns,
    dateField: definition.dateField
  });
  const router = express.Router();
  const guard = [authenticate, requireRole(...definition.roles)];

  router.get('/', authenticate, asyncHandler(controller.list));
  router.get('/:id', authenticate, asyncHandler(controller.get));
  router.post('/', guard, asyncHandler(controller.create));
  router.put('/:id', guard, asyncHandler(controller.update));
  router.delete('/:id', guard, asyncHandler(controller.remove));

  return router;
}

module.exports = { makeCrudRouter };
