-- Archive the legacy lead-capture schema before enabling AIRA-DBMS.
-- Run this only in databases that still contain the old leads tables.

USE aira_dbms;

CREATE TABLE IF NOT EXISTS legacy_leads_archive AS
SELECT *
FROM leads
WHERE 1 = 0;

INSERT INTO legacy_leads_archive
SELECT *
FROM leads;

CREATE TABLE IF NOT EXISTS legacy_integrity_checks_archive AS
SELECT *
FROM integrity_checks
WHERE 1 = 0;

INSERT INTO legacy_integrity_checks_archive
SELECT *
FROM integrity_checks;

-- The old audit_log shape differs from the new DBMS audit_log.
-- Preserve it under a legacy name if it exists before running the new schema.
CREATE TABLE IF NOT EXISTS legacy_audit_log_archive AS
SELECT *
FROM audit_log
WHERE 1 = 0;

INSERT INTO legacy_audit_log_archive
SELECT *
FROM audit_log;

-- Archived data covers legacy leads only; academic data is handled separately.
-- Legacy leads do not contain enough normalized course/enrollment data to safely
-- generate real student records without manual review.
