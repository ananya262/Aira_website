# Deployment Guide

## 1. Database

1. Back up legacy lead data if it exists.
2. Run `migrations/001_archive_leads.sql` only on databases that still contain the old `leads` tables.
3. Run `aira_dbms_schema.sql` in MySQL 8.0.23 or newer.
4. Create MySQL users and apply the commented GRANT statements at the end of the schema.

## 2. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run seed:users
npm start
```

Set these variables in `backend/.env`:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `CORS_ORIGIN`

## 3. Frontend

The existing `src/` website remains the public site. New DBMS pages are:

- `src/login.html`
- `src/dashboard.html`

For local use, open `http://localhost:3000/login.html` after starting the backend. The backend serves `src/` as static files and exposes `/api/*`.

## 4. Verification

Run backend syntax and integration checks:

```bash
cd backend
npm test
```

Database integration tests are skipped unless `RUN_DB_TESTS=1` is set and MySQL has the schema loaded.

```bash
set RUN_DB_TESTS=1
npm test
```

## 5. Current Scope

Deploy only the student, course, faculty, enrollment, grade, attendance, statistics, audit, and user flows in this version.
