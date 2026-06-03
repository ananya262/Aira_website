require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const { makeCrudRouter } = require('./routes/crud.routes');
const enrollmentRoutes = require('./routes/enrollments.routes');
const gradeRoutes = require('./routes/grades.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const errorHandler = require('./middleware/error-handler');
const { ok } = require('./utils/response');

const app = express();
const origins = (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean);
const allowNullOrigin = process.env.NODE_ENV !== 'production';

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.length === 0 || origins.includes(origin) || (allowNullOrigin && origin === 'null')) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => ok(res, { status: 'healthy' }, 'AIRA-DBMS API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/students', makeCrudRouter('students'));
app.use('/api/courses', makeCrudRouter('courses'));
app.use('/api/faculty', makeCrudRouter('faculty'));
app.use('/api/course-faculty', makeCrudRouter('courseFaculty'));
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve frontend static files from the restructured frontend/public directory
app.use(express.static(path.resolve(__dirname, '../../frontend/public')));

app.use((req, res) => {
  res.status(404).json({ success: false, data: null, message: 'Route not found', error: req.path });
});
app.use(errorHandler);

module.exports = app;
