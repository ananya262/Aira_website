# AIRA-DBMS API

Base URL: `http://localhost:3000/api`

All protected routes require:

```http
Authorization: Bearer <jwt>
```

Response shape:

```json
{
  "success": true,
  "data": {},
  "message": "OK",
  "error": null
}
```

## Auth

- `POST /auth/login`

Body:

```json
{ "username": "admin", "password": "admin123" }
```

## CRUD Modules

- `GET /students`
- `GET /students/:id`
- `POST /students`
- `PUT /students/:id`
- `DELETE /students/:id`

The same pattern is available for:

- `/courses`
- `/faculty`
- `/course-faculty`

## Enrollments

- `GET /enrollments`
- `GET /enrollments/:id`
- `POST /enrollments`
- `PUT /enrollments/:id`
- `DELETE /enrollments/:id`

Create body:

```json
{ "student_id": 1, "course_id": 1, "status": "active" }
```

## Grades

- `GET /grades`
- `GET /grades/:student_id/:course_id`
- `POST /grades`
- `PUT /grades/:id`

Create body:

```json
{ "student_id": 1, "course_id": 1, "marks_obtained": 84, "total_marks": 100 }
```

## Attendance

- `GET /attendance`
- `GET /attendance/:student_id/:course_id`
- `POST /attendance`

Bulk body:

```json
{
  "records": [
    { "student_id": 1, "course_id": 1, "attendance_date": "2026-05-22", "is_present": true, "class_count": 1 }
  ]
}
```

## Dashboard Views

- `GET /dashboard/student-performance`
- `GET /dashboard/course-utilization`
- `GET /dashboard/faculty-workload`
- `GET /dashboard/attendance-summary`
