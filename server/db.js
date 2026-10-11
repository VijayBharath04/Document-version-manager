/**
 * DOCUMENT VERSION MANAGER - Database Layer
 * SQLite persistent storage using better-sqlite3 with indexing & prepared queries
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'dvm.db');
const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize Schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT,
      role TEXT DEFAULT 'User',
      status TEXT DEFAULT 'Active',
      enrolled_course TEXT DEFAULT 'Software Configuration Management (CS804)',
      college TEXT DEFAULT 'Faculty of Computer Engineering',
      roll_no TEXT DEFAULT 'SCM-2026-088',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      current_version TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      size TEXT NOT NULL,
      total_versions INTEGER DEFAULT 1,
      last_updated TEXT DEFAULT 'Just now',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT NOT NULL,
      version TEXT NOT NULL,
      type TEXT NOT NULL,
      author TEXT NOT NULL,
      size TEXT NOT NULL,
      description TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_doc_versions ON document_versions(document_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      icon TEXT DEFAULT 'fa-bell',
      icon_color TEXT DEFAULT 'text-primary',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      document TEXT NOT NULL,
      version TEXT NOT NULL,
      status TEXT DEFAULT 'Success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      code TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      verified INTEGER DEFAULT 0,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone_number);
  `);
}

initSchema();

// OTP DAO
const otpDAO = {
  create(phone, code, validitySeconds = 300) {
    const expiresAt = Date.now() + (validitySeconds * 1000);
    // Invalidate prior pending codes for this phone
    db.prepare('UPDATE otp_codes SET verified = -1 WHERE phone_number = ? AND verified = 0').run(phone);
    const stmt = db.prepare(`
      INSERT INTO otp_codes (phone_number, code, attempts, verified, expires_at, created_at)
      VALUES (?, ?, 0, 0, ?, CURRENT_TIMESTAMP)
    `);
    const info = stmt.run(phone, code, expiresAt);
    return db.prepare('SELECT * FROM otp_codes WHERE id = ?').get(info.lastInsertRowid);
  },

  findLatestPending(phone) {
    return db.prepare(`
      SELECT * FROM otp_codes 
      WHERE phone_number = ? AND verified = 0 
      ORDER BY id DESC LIMIT 1
    `).get(phone);
  },

  incrementAttempts(id) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(id);
    return db.prepare('SELECT * FROM otp_codes WHERE id = ?').get(id);
  },

  markVerified(id) {
    db.prepare('UPDATE otp_codes SET verified = 1 WHERE id = ?').run(id);
  }
};

// User DAO
const userDAO = {
  findByPhone(phone) {
    return db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phone);
  },

  findById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  create({ id, phone_number, full_name, email, role, status, enrolled_course, college, roll_no }) {
    const stmt = db.prepare(`
      INSERT INTO users (id, phone_number, full_name, email, role, status, enrolled_course, college, roll_no, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      phone_number,
      full_name || 'SCM User',
      email || '',
      role || 'User',
      status || 'Active',
      enrolled_course || 'Software Configuration Management (CS804)',
      college || 'Faculty of Computer Engineering',
      roll_no || 'SCM-2026-088'
    );
    return this.findById(id);
  },

  update(id, { full_name, email }) {
    db.prepare(`
      UPDATE users 
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, email, id);
    return this.findById(id);
  },

  updatePhone(id, newPhone) {
    db.prepare(`
      UPDATE users
      SET phone_number = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPhone, id);
    return this.findById(id);
  },

  getAll() {
    return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  }
};

// Documents DAO
const docDAO = {
  getByUserId(userId) {
    return db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  },

  getById(id, userId) {
    return db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
  },

  create({ id, user_id, name, type, current_version, status, size, total_versions, last_updated }) {
    db.prepare(`
      INSERT INTO documents (id, user_id, name, type, current_version, status, size, total_versions, last_updated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id, user_id, name, type,
      current_version || 'v1.0',
      status || 'Active',
      size || '1.5 MB',
      total_versions || 1,
      last_updated || 'Just now'
    );
    return this.getById(id, user_id);
  },

  updateStatus(id, userId, status) {
    db.prepare(`UPDATE documents SET status = ? WHERE id = ? AND user_id = ?`).run(status, id, userId);
    return this.getById(id, userId);
  },

  updateVersion(id, userId, version, lastUpdated, totalVersions) {
    db.prepare(`
      UPDATE documents 
      SET current_version = ?, last_updated = ?, total_versions = ?
      WHERE id = ? AND user_id = ?
    `).run(version, lastUpdated, totalVersions, id, userId);
    return this.getById(id, userId);
  }
};

// Versions DAO
const versionDAO = {
  getByDocId(docId) {
    return db.prepare('SELECT * FROM document_versions WHERE document_id = ? ORDER BY id ASC').all(docId);
  },

  create({ document_id, version, type, author, size, description, content }) {
    const stmt = db.prepare(`
      INSERT INTO document_versions (document_id, version, type, author, size, description, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    const info = stmt.run(document_id, version, type, author, size, description || '', content || '');
    return db.prepare('SELECT * FROM document_versions WHERE id = ?').get(info.lastInsertRowid);
  }
};

// Notifications DAO
const notificationDAO = {
  getByUserId(userId) {
    return db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  },

  create({ id, user_id, title, message, icon, icon_color }) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, read, icon, icon_color, created_at)
      VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, user_id, title, message, icon || 'fa-bell', icon_color || 'text-primary');
  },

  markAllRead(userId) {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  }
};

// Activities DAO
const activityDAO = {
  getByUserId(userId) {
    return db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(userId);
  },

  create({ id, user_id, action, document, version, status }) {
    db.prepare(`
      INSERT INTO activities (id, user_id, action, document, version, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, user_id, action, document, version, status || 'Success');
  }
};

// Seed default initial user documents & data for demo user if table is empty
function seedIfEmpty(userId, userName) {
  const existingDocs = docDAO.getByUserId(userId);
  if (existingDocs.length > 0) return;

  const initialDocs = [
    {
      id: "doc-1",
      name: "Project Report.pdf",
      type: "pdf",
      current_version: "v3.0",
      status: "Active",
      size: "4.2 MB",
      total_versions: 3,
      last_updated: "Today, 10:30 AM"
    },
    {
      id: "doc-2",
      name: "Software Requirements.docx",
      type: "docx",
      current_version: "v2.2",
      status: "Active",
      size: "1.8 MB",
      total_versions: 3,
      last_updated: "Yesterday, 04:15 PM"
    },
    {
      id: "doc-3",
      name: "System Design.docx",
      type: "docx",
      current_version: "v5.2",
      status: "Active",
      size: "3.4 MB",
      total_versions: 4,
      last_updated: "2 days ago"
    },
    {
      id: "doc-4",
      name: "Database Design.pdf",
      type: "pdf",
      current_version: "v2.0",
      status: "Active",
      size: "2.1 MB",
      total_versions: 2,
      last_updated: "3 days ago"
    },
    {
      id: "doc-5",
      name: "Research Paper.pdf",
      type: "pdf",
      current_version: "v2.1",
      status: "Archived",
      size: "5.0 MB",
      total_versions: 2,
      last_updated: "4 days ago"
    },
    {
      id: "doc-6",
      name: "Presentation.pptx",
      type: "pptx",
      current_version: "v1.4",
      status: "Active",
      size: "8.5 MB",
      total_versions: 2,
      last_updated: "5 days ago"
    },
    {
      id: "doc-7",
      name: "Meeting Notes.txt",
      type: "txt",
      current_version: "v1.1",
      status: "Active",
      size: "120 KB",
      total_versions: 2,
      last_updated: "6 days ago"
    },
    {
      id: "doc-8",
      name: "Project Proposal.docx",
      type: "docx",
      current_version: "v3.1",
      status: "Active",
      size: "2.7 MB",
      total_versions: 3,
      last_updated: "1 week ago"
    }
  ];

  initialDocs.forEach((d, idx) => {
    docDAO.create({ ...d, id: `${userId}-doc-${idx + 1}`, user_id: userId });
  });

  const firstDocId = `${userId}-doc-1`;

  // Seed versions for first doc
  versionDAO.create({
    document_id: firstDocId,
    version: "v1.0",
    type: "Initial Baseline",
    author: userName,
    size: "3.1 MB",
    description: "Initial document upload for semester project evaluation",
    content: "1. INTRODUCTION\nDocument Version Manager is a collegiate SCM system built to illustrate baseline tracking.\n2. SYSTEM ARCHITECTURE\nClient presentation tier with local state."
  });
  versionDAO.create({
    document_id: firstDocId,
    version: "v2.0",
    type: "Major Revision",
    author: userName,
    size: "3.8 MB",
    description: "Added system architecture diagrams and audit logging specs",
    content: "1. INTRODUCTION\nDocument Version Manager baseline tracking.\n2. SYSTEM ARCHITECTURE\nResponsive Web Interface with backend integration.\n3. SCM WORKFLOW\nVisual comparison and restore."
  });
  versionDAO.create({
    document_id: firstDocId,
    version: "v3.0",
    type: "Current Release",
    author: userName,
    size: "4.2 MB",
    description: "Production release with mobile OTP and database backend",
    content: "1. INTRODUCTION\nDocument Version Manager is an enterprise-grade SCM system.\n2. SYSTEM ARCHITECTURE\nFull-stack architecture with real-time SMS OTP and SQL persistence."
  });

  // Seed notifications
  notificationDAO.create({
    id: `${userId}-notif-1`,
    user_id: userId,
    title: "Document Updated",
    message: "Project Report.pdf was updated to v3.0.",
    icon: "fa-file-arrow-up",
    icon_color: "text-primary"
  });
  notificationDAO.create({
    id: `${userId}-notif-2`,
    user_id: userId,
    title: "Authentication Verified",
    message: "Mobile number verified via SMS OTP.",
    icon: "fa-shield-check",
    icon_color: "text-success"
  });

  // Seed activities
  activityDAO.create({
    id: `${userId}-act-1`,
    user_id: userId,
    action: "Login",
    document: "Authentication Portal",
    version: "v1.0",
    status: "Success"
  });
  activityDAO.create({
    id: `${userId}-act-2`,
    user_id: userId,
    action: "Upload",
    document: "Project Report.pdf",
    version: "v3.0",
    status: "Success"
  });
}

module.exports = {
  db,
  otpDAO,
  userDAO,
  docDAO,
  versionDAO,
  notificationDAO,
  activityDAO,
  seedIfEmpty
};
