# Migration Guide: Leads to AIRA-DBMS

The legacy project stored public website submissions in `leads`, `audit_log`, and `integrity_checks`. The new AIRA-DBMS schema is normalized around students, courses, faculty, enrollments, grades, attendance, statistics, audit logs, and app users.

## Recommended Migration

1. Export or back up the existing MySQL database.
2. Run `migrations/001_archive_leads.sql` before replacing the old schema.
3. Run `aira_dbms_schema.sql`.
4. Manually review archived leads before converting them into real `students`.

## Why Leads Are Not Auto-Imported

Legacy leads contain enquiry data: name, grade, subject, phone, source, and status. They do not contain verified student email, course IDs, enrollment decisions, faculty assignments, grades, or attendance records. Auto-importing them would create incomplete normalized data.

## Current Scope

The current schema focuses on students, courses, faculty, enrollments, grades, attendance, statistics, audit logs, and app users.
