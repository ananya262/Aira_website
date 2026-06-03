-- AIRA Study Centre Database Management System (AIRA-DBMS)
-- MySQL 8.0+ schema for the AIRA-DBMS academic records module
-- Charset: utf8mb4 | Engine: InnoDB

CREATE DATABASE IF NOT EXISTS aira_dbms
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aira_dbms;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS v_attendance_summary;
DROP VIEW IF EXISTS v_faculty_workload;
DROP VIEW IF EXISTS v_course_utilization;
DROP VIEW IF EXISTS v_student_performance;
DROP PROCEDURE IF EXISTS sp_refresh_student_statistics;

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS app_users;
DROP TABLE IF EXISTS student_accounts;
DROP TABLE IF EXISTS student_statistics;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS course_faculty;
DROP TABLE IF EXISTS faculty;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(15),
  grade_level VARCHAR(20),
  joining_date DATE,
  contact_address TEXT,
  parent_phone VARCHAR(15),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_students_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  account_username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  account_status ENUM('active', 'suspended', 'closed') NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_student_accounts_student UNIQUE (student_id),
  CONSTRAINT uq_student_accounts_username UNIQUE (account_username),
  CONSTRAINT fk_student_accounts_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(100) NOT NULL,
  grade_level VARCHAR(20),
  course_code VARCHAR(20) NOT NULL,
  duration_hours INT NOT NULL,
  max_capacity INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_courses_course_code UNIQUE (course_code),
  CONSTRAINT chk_courses_duration CHECK (duration_hours > 0),
  CONSTRAINT chk_courses_capacity CHECK (max_capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(15),
  specialization VARCHAR(100),
  qualification VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_faculty_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE course_faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  faculty_id INT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT uq_course_faculty UNIQUE (course_id, faculty_id),
  CONSTRAINT fk_course_faculty_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_course_faculty_faculty FOREIGN KEY (faculty_id)
    REFERENCES faculty(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrollment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_enrollments_student_course UNIQUE (student_id, course_id),
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  date_recorded DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_grades_marks_nonnegative CHECK (marks_obtained >= 0),
  CONSTRAINT chk_grades_total_positive CHECK (total_marks > 0),
  CONSTRAINT chk_grades_percentage CHECK (percentage BETWEEN 0 AND 100),
  CONSTRAINT chk_grades_marks_within_total CHECK (marks_obtained <= total_marks),
  CONSTRAINT fk_grades_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_grades_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  is_present BOOLEAN NOT NULL DEFAULT TRUE,
  class_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_attendance_student_course_date UNIQUE (student_id, course_id, attendance_date),
  CONSTRAINT chk_attendance_class_count CHECK (class_count >= 1),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attendance_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  average_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  gpa DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  attendance_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_student_statistics_student UNIQUE (student_id),
  CONSTRAINT chk_statistics_average CHECK (average_percentage BETWEEN 0 AND 100),
  CONSTRAINT chk_statistics_gpa CHECK (gpa BETWEEN 0 AND 10),
  CONSTRAINT chk_statistics_attendance CHECK (attendance_percentage BETWEEN 0 AND 100),
  CONSTRAINT fk_statistics_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  changed_by VARCHAR(80) NOT NULL DEFAULT 'db_trigger',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_value TEXT,
  new_value TEXT,
  INDEX idx_audit_table_time (table_name, changed_at),
  INDEX idx_audit_operation (operation_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'faculty', 'student') NOT NULL,
  student_id INT NULL,
  faculty_id INT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_app_users_username UNIQUE (username),
  CONSTRAINT fk_app_users_student FOREIGN KEY (student_id)
    REFERENCES students(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_app_users_faculty FOREIGN KEY (faculty_id)
    REFERENCES faculty(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_course_faculty_course_id ON course_faculty (course_id);
CREATE INDEX idx_course_faculty_faculty_id ON course_faculty (faculty_id);
CREATE INDEX idx_enrollments_student_id ON enrollments (student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments (course_id);
CREATE INDEX idx_enrollments_date ON enrollments (enrollment_date);
CREATE INDEX idx_grades_student_id ON grades (student_id);
CREATE INDEX idx_grades_course_id ON grades (course_id);
CREATE INDEX idx_grades_date_recorded ON grades (date_recorded);
CREATE INDEX idx_attendance_student_id ON attendance (student_id);
CREATE INDEX idx_attendance_course_id ON attendance (course_id);
CREATE INDEX idx_attendance_date ON attendance (attendance_date);

DELIMITER $$

CREATE PROCEDURE sp_refresh_student_statistics(IN p_student_id INT)
BEGIN
  DECLARE v_average DECIMAL(5,2) DEFAULT 0.00;
  DECLARE v_gpa DECIMAL(3,2) DEFAULT 0.00;
  DECLARE v_attendance DECIMAL(5,2) DEFAULT 0.00;

  SELECT COALESCE(ROUND(AVG(percentage), 2), 0.00)
    INTO v_average
  FROM grades
  WHERE student_id = p_student_id;

  SET v_gpa = ROUND(v_average / 10, 2);

  SELECT COALESCE(
      ROUND(
        SUM(CASE WHEN is_present THEN class_count ELSE 0 END) / NULLIF(SUM(class_count), 0) * 100,
        2
      ),
      0.00
    )
    INTO v_attendance
  FROM attendance
  WHERE student_id = p_student_id;

  INSERT INTO student_statistics (student_id, average_percentage, gpa, attendance_percentage)
  VALUES (p_student_id, v_average, v_gpa, v_attendance)
  ON DUPLICATE KEY UPDATE
    average_percentage = v_average,
    gpa = v_gpa,
    attendance_percentage = v_attendance;
END$$

CREATE TRIGGER trg_students_after_insert
AFTER INSERT ON students
FOR EACH ROW
BEGIN
  INSERT INTO student_statistics (student_id)
  VALUES (NEW.id)
  ON DUPLICATE KEY UPDATE student_id = NEW.id;

  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('students', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'name', NEW.name, 'email', NEW.email));
END$$

CREATE TRIGGER trg_students_after_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'students',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'name', OLD.name, 'email', OLD.email, 'phone', OLD.phone, 'grade_level', OLD.grade_level),
    JSON_OBJECT('id', NEW.id, 'name', NEW.name, 'email', NEW.email, 'phone', NEW.phone, 'grade_level', NEW.grade_level)
  );
END$$

CREATE TRIGGER trg_students_before_delete
BEFORE DELETE ON students
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value)
  VALUES ('students', 'DELETE', CURRENT_USER(), JSON_OBJECT('id', OLD.id, 'name', OLD.name, 'email', OLD.email));
END$$

CREATE TRIGGER trg_courses_after_insert
AFTER INSERT ON courses
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('courses', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'course_name', NEW.course_name, 'course_code', NEW.course_code));
END$$

CREATE TRIGGER trg_courses_after_update
AFTER UPDATE ON courses
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'courses',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'course_name', OLD.course_name, 'course_code', OLD.course_code, 'max_capacity', OLD.max_capacity),
    JSON_OBJECT('id', NEW.id, 'course_name', NEW.course_name, 'course_code', NEW.course_code, 'max_capacity', NEW.max_capacity)
  );
END$$

CREATE TRIGGER trg_faculty_after_insert
AFTER INSERT ON faculty
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('faculty', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'faculty_name', NEW.faculty_name, 'email', NEW.email));
END$$

CREATE TRIGGER trg_faculty_after_update
AFTER UPDATE ON faculty
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'faculty',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'faculty_name', OLD.faculty_name, 'email', OLD.email),
    JSON_OBJECT('id', NEW.id, 'faculty_name', NEW.faculty_name, 'email', NEW.email)
  );
END$$

CREATE TRIGGER trg_dedup_check
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1
    FROM enrollments
    WHERE student_id = NEW.student_id
      AND course_id = NEW.course_id
  ) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Duplicate enrollment: student is already enrolled in this course';
  END IF;
END$$

CREATE TRIGGER trg_after_enrollment_insert
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(NEW.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('enrollments', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'status', NEW.status));
END$$

CREATE TRIGGER trg_enrollments_after_update
AFTER UPDATE ON enrollments
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'enrollments',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'status', OLD.status),
    JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'status', NEW.status)
  );
END$$

CREATE TRIGGER trg_before_enrollment_delete
BEFORE DELETE ON enrollments
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value)
  VALUES (
    'enrollments',
    'DELETE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'status', OLD.status)
  );
END$$

CREATE TRIGGER trg_grades_before_insert
BEFORE INSERT ON grades
FOR EACH ROW
BEGIN
  SET NEW.percentage = ROUND((NEW.marks_obtained / NEW.total_marks) * 100, 2);
END$$

CREATE TRIGGER trg_grades_before_update
BEFORE UPDATE ON grades
FOR EACH ROW
BEGIN
  SET NEW.percentage = ROUND((NEW.marks_obtained / NEW.total_marks) * 100, 2);
END$$

CREATE TRIGGER trg_after_grade_insert
AFTER INSERT ON grades
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(NEW.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('grades', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'percentage', NEW.percentage));
END$$

CREATE TRIGGER trg_grades_after_update
AFTER UPDATE ON grades
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(NEW.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'grades',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'percentage', OLD.percentage),
    JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'percentage', NEW.percentage)
  );
END$$

CREATE TRIGGER trg_grades_after_delete
AFTER DELETE ON grades
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(OLD.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value)
  VALUES ('grades', 'DELETE', CURRENT_USER(), JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'percentage', OLD.percentage));
END$$

CREATE TRIGGER trg_after_attendance_insert
AFTER INSERT ON attendance
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(NEW.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, new_value)
  VALUES ('attendance', 'INSERT', CURRENT_USER(), JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'attendance_date', NEW.attendance_date, 'is_present', NEW.is_present));
END$$

CREATE TRIGGER trg_after_attendance_update
AFTER UPDATE ON attendance
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(NEW.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value, new_value)
  VALUES (
    'attendance',
    'UPDATE',
    CURRENT_USER(),
    JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'attendance_date', OLD.attendance_date, 'is_present', OLD.is_present),
    JSON_OBJECT('id', NEW.id, 'student_id', NEW.student_id, 'course_id', NEW.course_id, 'attendance_date', NEW.attendance_date, 'is_present', NEW.is_present)
  );
END$$

CREATE TRIGGER trg_attendance_after_delete
AFTER DELETE ON attendance
FOR EACH ROW
BEGIN
  CALL sp_refresh_student_statistics(OLD.student_id);

  INSERT INTO audit_log (table_name, operation_type, changed_by, old_value)
  VALUES ('attendance', 'DELETE', CURRENT_USER(), JSON_OBJECT('id', OLD.id, 'student_id', OLD.student_id, 'course_id', OLD.course_id, 'attendance_date', OLD.attendance_date, 'is_present', OLD.is_present));
END$$

DELIMITER ;

CREATE VIEW v_student_performance AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  s.email,
  c.id AS course_id,
  c.course_name,
  COALESCE(ROUND(AVG(g.percentage), 2), 0.00) AS avg_marks,
  COALESCE(ss.attendance_percentage, 0.00) AS attendance_pct,
  COALESCE(ss.gpa, 0.00) AS gpa,
  e.status AS enrollment_status
FROM students s
JOIN enrollments e ON e.student_id = s.id
JOIN courses c ON c.id = e.course_id
LEFT JOIN grades g ON g.student_id = s.id AND g.course_id = c.id
LEFT JOIN student_statistics ss ON ss.student_id = s.id
GROUP BY s.id, s.name, s.email, c.id, c.course_name, ss.attendance_percentage, ss.gpa, e.status;

CREATE VIEW v_course_utilization AS
SELECT
  c.id AS course_id,
  c.course_name,
  c.course_code,
  c.grade_level,
  c.max_capacity,
  COUNT(e.id) AS enrollment_count,
  ROUND((COUNT(e.id) / c.max_capacity) * 100, 2) AS fill_percentage
FROM courses c
LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
GROUP BY c.id, c.course_name, c.course_code, c.grade_level, c.max_capacity;

CREATE VIEW v_faculty_workload AS
SELECT
  f.id AS faculty_id,
  f.faculty_name,
  f.specialization,
  COUNT(DISTINCT cf.course_id) AS course_count,
  COUNT(DISTINCT e.student_id) AS total_students
FROM faculty f
LEFT JOIN course_faculty cf ON cf.faculty_id = f.id
LEFT JOIN enrollments e ON e.course_id = cf.course_id AND e.status = 'active'
GROUP BY f.id, f.faculty_name, f.specialization;

CREATE VIEW v_attendance_summary AS
SELECT
  s.id AS student_id,
  s.name AS student_name,
  c.id AS course_id,
  c.course_name,
  SUM(CASE WHEN a.is_present THEN a.class_count ELSE 0 END) AS classes_attended,
  SUM(a.class_count) AS total_classes,
  COALESCE(
    ROUND(SUM(CASE WHEN a.is_present THEN a.class_count ELSE 0 END) / NULLIF(SUM(a.class_count), 0) * 100, 2),
    0.00
  ) AS attendance_percentage
FROM students s
JOIN attendance a ON a.student_id = s.id
JOIN courses c ON c.id = a.course_id
GROUP BY s.id, s.name, c.id, c.course_name;

-- Create users separately with secure passwords, then apply grants as needed.
-- CREATE USER 'aira_admin'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
-- CREATE USER 'aira_app'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
-- CREATE USER 'aira_readonly'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
-- GRANT ALL PRIVILEGES ON aira_dbms.* TO 'aira_admin'@'%';
-- GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON aira_dbms.* TO 'aira_app'@'%';
-- GRANT SELECT ON aira_dbms.* TO 'aira_readonly'@'%';
-- FLUSH PRIVILEGES;
