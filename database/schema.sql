-- ==========================================================================
-- CIVIC CONNECT — Smart Public Issue Reporting System
-- MySQL Database Schema
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS civic_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE civic_connect;

-- --------------------------------------------------------------------------
-- USERS  (citizens + admins/staff)
-- --------------------------------------------------------------------------
CREATE TABLE users (
  id            VARCHAR(20)  PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('citizen','admin') NOT NULL DEFAULT 'citizen',
  area          VARCHAR(150),
  avatar_url    VARCHAR(255),
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- PASSWORD RESET OTPs
-- --------------------------------------------------------------------------
CREATE TABLE password_resets (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL,
  otp_code    VARCHAR(10) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- DEPARTMENTS
-- --------------------------------------------------------------------------
CREATE TABLE departments (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(100) NOT NULL UNIQUE,
  contact_email VARCHAR(150),
  contact_phone VARCHAR(20)
) ENGINE=InnoDB;

INSERT INTO departments (name) VALUES
  ('Roads Department'), ('Sanitation Department'), ('Water Supply'),
  ('Electricity Board'), ('Municipal Corporation'), ('Police Department');

-- --------------------------------------------------------------------------
-- CATEGORIES
-- --------------------------------------------------------------------------
CREATE TABLE categories (
  id            VARCHAR(30) PRIMARY KEY,
  label         VARCHAR(100) NOT NULL,
  icon          VARCHAR(50),
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB;

INSERT INTO categories (id,label,icon,department_id) VALUES
  ('road','Road Damage','fa-road',1),
  ('pothole','Potholes','fa-triangle-exclamation',1),
  ('garbage','Garbage Overflow','fa-dumpster',2),
  ('water','Water Leakage','fa-faucet-drip',3),
  ('drainage','Drainage Problems','fa-water',3),
  ('streetlight','Broken Street Lights','fa-lightbulb',4),
  ('dumping','Illegal Dumping','fa-trash',5),
  ('tree','Tree Fallen','fa-tree',5),
  ('safety','Public Safety Issues','fa-shield-halved',6);

-- --------------------------------------------------------------------------
-- COMPLAINTS
-- --------------------------------------------------------------------------
CREATE TABLE complaints (
  id                VARCHAR(20) PRIMARY KEY,
  user_id           VARCHAR(20) NOT NULL,
  category_id       VARCHAR(30) NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  severity          ENUM('Low','Medium','High') DEFAULT 'Medium',
  status            ENUM('Pending','Verified','Assigned','In Progress','Resolved') DEFAULT 'Pending',
  department_id     INT,
  area              VARCHAR(150),
  latitude          DECIMAL(10,7),
  longitude         DECIMAL(10,7),
  photo_url         VARCHAR(255),
  completion_photo_url VARCHAR(255),
  voice_note_url    VARCHAR(255),
  rating            TINYINT NULL,
  feedback          TEXT,
  is_duplicate_of   VARCHAR(20) NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (is_duplicate_of) REFERENCES complaints(id),
  INDEX idx_status (status),
  INDEX idx_category (category_id),
  INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- COMPLAINT STATUS HISTORY (audit trail / progress timeline)
-- --------------------------------------------------------------------------
CREATE TABLE complaint_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id  VARCHAR(20) NOT NULL,
  status        VARCHAR(30) NOT NULL,
  changed_by    VARCHAR(20),
  remark        TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- NOTIFICATIONS
-- --------------------------------------------------------------------------
CREATE TABLE notifications (
  id          VARCHAR(20) PRIMARY KEY,
  user_id     VARCHAR(20) NOT NULL,
  text        VARCHAR(255) NOT NULL,
  type        ENUM('info','success','warning','error') DEFAULT 'info',
  is_read     TINYINT(1) DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------------
-- SEED: demo accounts (password hashes are bcrypt of admin123 / demo1234)
-- Replace hashes after running `node scripts/hash-passwords.js` if desired.
-- --------------------------------------------------------------------------
INSERT INTO users (id,name,email,phone,password_hash,role,area) VALUES
  ('U-ADMIN','Municipal Admin','admin@civicconnect.gov','9000000000','$2b$10$replace_with_real_bcrypt_hash','admin',NULL),
  ('U-DEMO','Arun Kumar','citizen@demo.com','9876543210','$2b$10$replace_with_real_bcrypt_hash','citizen','Gandhipuram, Coimbatore');
