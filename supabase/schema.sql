-- ═══════════════════════════════════════════════════════
-- AIRA Study Centre — MySQL Schema
-- Module 4.1 — Primary Datastore
-- ═══════════════════════════════════════════════════════
--
-- DEPLOYMENT:
-- 1. Connect to your MySQL server
-- 2. Create the database: CREATE DATABASE aira_study_centre;
-- 3. Select the database: USE aira_study_centre;
-- 4. Run this entire file
-- 5. Verify tables and triggers
-- 6. Create application users with appropriate GRANTs
-- ═══════════════════════════════════════════════════════

-- ──────────────── LEADS TABLE ────────────────

CREATE TABLE IF NOT EXISTS leads (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    created_at      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()),
    form_type       ENUM('demo', 'diagnostic') NOT NULL,
    student_name    VARCHAR(255) NOT NULL,
    grade           INT NOT NULL,
    subject         ENUM('Maths', 'Science', 'Both') NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    page_url        TEXT,
    utm_source      TEXT,
    recaptcha_score DECIMAL(3,2),
    status          ENUM('new', 'contacted', 'enrolled', 'duplicate', 'spam') NOT NULL DEFAULT 'new',
    notes           TEXT,
    updated_at      DATETIME NOT NULL DEFAULT (UTC_TIMESTAMP()) ON UPDATE CURRENT_TIMESTAMP,

    -- grade must be between 7 and 10
    CONSTRAINT chk_grade CHECK (grade BETWEEN 7 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────── AUDIT LOG TABLE ────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    lead_id     CHAR(36),
    action      VARCHAR(50) NOT NULL,
    changed_by  VARCHAR(255),
    changed_at  DATETIME DEFAULT (UTC_TIMESTAMP()),
    old_values  JSON,
    new_values  JSON,

    CONSTRAINT fk_audit_lead FOREIGN KEY (lead_id)
        REFERENCES leads(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────── INTEGRITY CHECKS TABLE ────────────────

CREATE TABLE IF NOT EXISTS integrity_checks (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_at      DATETIME DEFAULT (UTC_TIMESTAMP()),
    check_name  VARCHAR(255),
    result      VARCHAR(50),
    details     JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────── DEDUPLICATION ────────────────
-- MySQL does not support partial unique indexes (WHERE clause).
-- Instead, we use a generated column to compute the date portion
-- of created_at, and a BEFORE INSERT trigger to enforce the
-- deduplication rule: same phone + form_type + calendar day
-- (excluding duplicates) can only appear once.

-- Add a generated column for the date part of created_at
ALTER TABLE leads
    ADD COLUMN created_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED;

-- Unique index on (phone, form_type, created_date) for non-duplicate leads.
-- Since MySQL doesn't support partial indexes, the dedup enforcement for
-- status != 'duplicate' is handled via a BEFORE INSERT trigger below.
-- This index still helps with performance for lookups.
CREATE INDEX idx_leads_dedup ON leads (phone, form_type, created_date);

-- ──────────────── PERFORMANCE INDEXES ────────────────

CREATE INDEX idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX idx_leads_phone ON leads (phone);
CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_form_type ON leads (form_type);

-- ──────────────── DEDUPLICATION TRIGGER ────────────────
-- Enforces: same phone + form_type can only submit once per
-- calendar day (unless the new row is being inserted as 'duplicate')
-- This replicates PostgreSQL's partial unique index behavior.

DELIMITER $$

CREATE TRIGGER trg_leads_dedup_check
BEFORE INSERT ON leads
FOR EACH ROW
BEGIN
    DECLARE existing_count INT;

    -- Only enforce dedup if the new row's status is NOT 'duplicate'
    IF NEW.status != 'duplicate' THEN
        SELECT COUNT(*) INTO existing_count
        FROM leads
        WHERE phone = NEW.phone
          AND form_type = NEW.form_type
          AND DATE(created_at) = DATE(NEW.created_at)
          AND status != 'duplicate';

        IF existing_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Duplicate submission: same phone + form_type already exists for this date';
        END IF;
    END IF;
END$$

DELIMITER ;

-- ──────────────── AUDIT LOG TRIGGERS ────────────────
-- Populates audit_log on every UPDATE to leads

DELIMITER $$

CREATE TRIGGER trigger_leads_audit
AFTER UPDATE ON leads
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (lead_id, action, changed_by, old_values, new_values)
    VALUES (
        NEW.id,
        'UPDATE',
        CURRENT_USER(),
        JSON_OBJECT(
            'id', OLD.id,
            'created_at', OLD.created_at,
            'form_type', OLD.form_type,
            'student_name', OLD.student_name,
            'grade', OLD.grade,
            'subject', OLD.subject,
            'phone', OLD.phone,
            'page_url', OLD.page_url,
            'utm_source', OLD.utm_source,
            'recaptcha_score', OLD.recaptcha_score,
            'status', OLD.status,
            'notes', OLD.notes,
            'updated_at', OLD.updated_at
        ),
        JSON_OBJECT(
            'id', NEW.id,
            'created_at', NEW.created_at,
            'form_type', NEW.form_type,
            'student_name', NEW.student_name,
            'grade', NEW.grade,
            'subject', NEW.subject,
            'phone', NEW.phone,
            'page_url', NEW.page_url,
            'utm_source', NEW.utm_source,
            'recaptcha_score', NEW.recaptcha_score,
            'status', NEW.status,
            'notes', NEW.notes,
            'updated_at', NEW.updated_at
        )
    );
END$$

DELIMITER ;

-- Also log inserts for full audit trail

DELIMITER $$

CREATE TRIGGER trigger_leads_audit_insert
AFTER INSERT ON leads
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (lead_id, action, changed_by, new_values)
    VALUES (
        NEW.id,
        'INSERT',
        CURRENT_USER(),
        JSON_OBJECT(
            'id', NEW.id,
            'created_at', NEW.created_at,
            'form_type', NEW.form_type,
            'student_name', NEW.student_name,
            'grade', NEW.grade,
            'subject', NEW.subject,
            'phone', NEW.phone,
            'page_url', NEW.page_url,
            'utm_source', NEW.utm_source,
            'recaptcha_score', NEW.recaptcha_score,
            'status', NEW.status,
            'notes', NEW.notes,
            'updated_at', NEW.updated_at
        )
    );
END$$

DELIMITER ;

-- ══════════════════════════════════════════════
-- ACCESS CONTROL (replaces PostgreSQL RLS)
-- ══════════════════════════════════════════════
-- MySQL does not have Row Level Security.
-- Instead, create dedicated users with appropriate privileges.
--
-- USAGE:
-- 1. Create an 'anon' user for public website form submissions
-- 2. Create an 'admin' user for dashboard/management access
-- 3. Run the GRANT statements below after creating the users
--
-- Example user creation (adjust passwords as needed):
--   CREATE USER 'aira_anon'@'%' IDENTIFIED BY 'CHANGE_ME';
--   CREATE USER 'aira_admin'@'%' IDENTIFIED BY 'CHANGE_ME';
-- ══════════════════════════════════════════════

-- ── Anon User: Can only INSERT into leads (from website forms) ──
-- GRANT INSERT ON aira_study_centre.leads TO 'aira_anon'@'%';

-- ── Anon User: Can INSERT into audit_log (edge function writes audit logs) ──
-- GRANT INSERT ON aira_study_centre.audit_log TO 'aira_anon'@'%';

-- ── Anon User: Can INSERT into integrity_checks (Apps Script service) ──
-- GRANT INSERT ON aira_study_centre.integrity_checks TO 'aira_anon'@'%';

-- ── Admin User: Full CRUD on leads ──
-- GRANT SELECT, INSERT, UPDATE, DELETE ON aira_study_centre.leads TO 'aira_admin'@'%';

-- ── Admin User: Can read audit log and integrity checks ──
-- GRANT SELECT ON aira_study_centre.audit_log TO 'aira_admin'@'%';
-- GRANT SELECT ON aira_study_centre.integrity_checks TO 'aira_admin'@'%';

-- ══════════════════════════════════════════════
-- BACKUP DOCUMENTATION
-- ══════════════════════════════════════════════
--
-- MySQL Native Backups:
-- ─────────────────────
-- Use mysqldump for logical backups:
--   mysqldump -u root -p aira_study_centre > aira_backup_$(date +%Y-%m-%d).sql
--
-- For automated daily backups, set up a cron job:
--   0 3 * * * mysqldump -u root -p'PASSWORD' aira_study_centre > /backups/aira_$(date +\%Y-\%m-\%d).sql
--
-- Binary Log / Point-in-Time Recovery:
-- ─────────────────────────────────────
-- 1. Enable binary logging in my.cnf:
--    [mysqld]
--    log_bin = mysql-bin
--    binlog_format = ROW
--    expire_logs_days = 7
-- 2. Use mysqlbinlog to replay events for PITR
--
-- Additional GCS Backup:
-- ─────────────────────
-- See Dashboard.gs exportToGCS() function for the Apps Script
-- approach that exports leads to Google Cloud Storage daily.
