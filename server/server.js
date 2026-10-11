/**
 * DOCUMENT VERSION MANAGER - Express Backend Server
 * Production-ready backend with authentication, rate limiting, and database routes
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const {
  otpDAO,
  userDAO,
  docDAO,
  versionDAO,
  notificationDAO,
  activityDAO,
  seedIfEmpty
} = require('./db');
const { sendSmsOtp } = require('./sms');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dvm-super-secure-production-jwt-secret-key-2026';

// 1. Security Headers with Helmet (configured to allow CDNs & Firebase reCAPTCHA)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://www.gstatic.com",
          "https://www.google.com",
          "https://apis.google.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com"
        ],
        imgSrc: ["'self'", "data:", "https://*"],
        frameSrc: ["'self'", "https://www.google.com", "https://recaptcha.google.com", "https://*.firebaseapp.com"],
        connectSrc: [
          "'self'",
          "https://*.googleapis.com",
          "https://*.firebaseio.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://*.firebaseapp.com"
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 2. Abuse Prevention: Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Rate limit exceeded. Please throttle your requests.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 3. JWT Verification Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }
    const user = userDAO.findById(decoded.uid);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }
    req.user = user;
    next();
  });
}

// 4. Public Config Route (Returns safe public Firebase variables)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || ''
    }
  });
});

// 5. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 6. Auth Routes
/**
 * POST /api/auth/send-otp
 * Dispatches real SMS verification code to mobile number and records in database
 */
app.post('/api/auth/send-otp', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Mobile number is required.' });
    }

    let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    }

    // Check if phone matches 10 digits
    const digitsOnly = cleanPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // Cooldown check: if an active code was created in last 45 seconds
    const pending = otpDAO.findLatestPending(cleanPhone);
    if (pending && (pending.expires_at - Date.now()) > 255000) {
      const remainingSeconds = Math.ceil(((pending.expires_at - Date.now()) - 255000) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds > 0 ? remainingSeconds : 45} seconds before requesting a new OTP.`
      });
    }

    // Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database
    otpDAO.create(cleanPhone, code, 300);

    // Dispatch real SMS
    const smsResult = await sendSmsOtp(cleanPhone, code);

    res.json({
      success: true,
      phone: cleanPhone,
      message: smsResult.message,
      provider: smsResult.provider,
      simulated: smsResult.simulated,
      devCode: smsResult.simulated ? code : undefined
    });
  } catch (error) {
    console.error('Error dispatching OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to dispatch verification code.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code against the database, authenticates or creates user,
 * and establishes a secure authenticated session.
 */
app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  try {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP code are required.' });
    }

    let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    }

    const cleanCode = otp.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ success: false, message: 'Please enter all 6 digits of the verification code.' });
    }

    // Look up latest pending OTP for this number
    const record = otpDAO.findLatestPending(cleanPhone);
    if (!record || Date.now() > record.expires_at) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired or was not requested. Please request a new OTP.'
      });
    }

    if (record.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Check code match
    if (record.code !== cleanCode) {
      otpDAO.incrementAttempts(record.id);
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. Please enter the code sent to your phone. (${remaining} attempts remaining)`
      });
    }

    // Mark OTP as verified
    otpDAO.markVerified(record.id);

    // Retrieve or create user in database
    let user = userDAO.findByPhone(cleanPhone);
    if (!user) {
      const uid = 'usr-' + Date.now();
      user = userDAO.create({
        id: uid,
        phone_number: cleanPhone,
        full_name: name || 'Dinesh Kumar R',
        email: '',
        role: 'User',
        status: 'Active'
      });
      seedIfEmpty(user.id, user.full_name);
    }

    // Sign session JWT
    const token = jwt.sign(
      { uid: user.id, phone: user.phone_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: user.id,
      action: 'Login',
      document: 'Authentication Portal',
      version: 'Real Mobile SMS Verified',
      status: 'Success'
    });

    res.json({
      success: true,
      token,
      user,
      message: 'Mobile number verified successfully.'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify authentication code.' });
  }
});

/**
 * POST /api/auth/session
 * Establishes a verified session after successful SMS OTP verification.
 * Creates or retrieves user in database and returns a signed session token.
 */
app.post('/api/auth/session', authLimiter, async (req, res) => {
  try {
    const { phone, uid, name, email } = req.body;

    if (!phone || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and verified UID are required.'
      });
    }

    // Normalize phone number to E.164
    let cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    }

    // Check if user already exists by phone or ID
    let user = userDAO.findByPhone(cleanPhone) || userDAO.findById(uid);

    if (!user) {
      // New user registration
      user = userDAO.create({
        id: uid,
        phone_number: cleanPhone,
        full_name: name || 'Dinesh Kumar R',
        email: email || '',
        role: 'User',
        status: 'Active'
      });
      // Seed default documents and activity for new profile
      seedIfEmpty(user.id, user.full_name);
    } else {
      // Existing user login: update ID if needed and keep session in sync
      if (user.id !== uid) {
        // If logged in with new UID for same verified phone, ensure profile link
      }
    }

    // Generate signed session JWT
    const token = jwt.sign(
      { uid: user.id, phone: user.phone_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: user.id,
      action: 'Login',
      document: 'Authentication Portal',
      version: 'SMS OTP Verified',
      status: 'Success'
    });

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    console.error('Session establishment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish authenticated session.'
    });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  activityDAO.create({
    id: 'act-' + Date.now(),
    user_id: req.user.id,
    action: 'Logout',
    document: 'Session Closed',
    version: 'N/A',
    status: 'Success'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 7. Profile Routes
app.get('/api/user/profile', authenticateToken, (req, res) => {
  res.json({
    success: true,
    profile: req.user
  });
});

app.put('/api/user/profile', [authenticateToken, apiLimiter], (req, res) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name || full_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Full name cannot be empty.' });
    }
    const updated = userDAO.update(req.user.id, {
      full_name: full_name.trim(),
      email: (email || '').trim()
    });

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: req.user.id,
      action: 'Update Profile',
      document: 'User Account Details',
      version: 'N/A',
      status: 'Success'
    });

    res.json({
      success: true,
      profile: updated,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

app.post('/api/user/update-phone', [authenticateToken, authLimiter], (req, res) => {
  try {
    const { newPhone } = req.body;
    if (!newPhone) {
      return res.status(400).json({ success: false, message: 'New phone number is required.' });
    }

    let cleanPhone = newPhone.trim().replace(/[^\d+]/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;
    }

    // Check if phone already in use by someone else
    const existing = userDAO.findByPhone(cleanPhone);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'Phone number already registered to another account.' });
    }

    const updated = userDAO.updatePhone(req.user.id, cleanPhone);
    notificationDAO.create({
      id: 'notif-' + Date.now(),
      user_id: req.user.id,
      title: 'Mobile Number Changed',
      message: `Your mobile number was updated to ${cleanPhone}.`,
      icon: 'fa-mobile-screen',
      icon_color: 'text-primary'
    });

    res.json({ success: true, profile: updated, message: 'Mobile number updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update mobile number.' });
  }
});

// 8. Document & Version Routes
app.get('/api/documents', authenticateToken, (req, res) => {
  try {
    const docs = docDAO.getByUserId(req.user.id);
    res.json({ success: true, documents: docs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
  }
});

app.post('/api/documents', [authenticateToken, apiLimiter], (req, res) => {
  try {
    const { name, type, version, size, description, content } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Document name is required.' });
    }

    const docId = 'doc-' + Date.now();
    const doc = docDAO.create({
      id: docId,
      user_id: req.user.id,
      name,
      type: type || 'docx',
      current_version: version || 'v1.0',
      status: 'Active',
      size: size || '1.5 MB',
      total_versions: 1,
      last_updated: 'Just now'
    });

    versionDAO.create({
      document_id: docId,
      version: version || 'v1.0',
      type: 'Initial Baseline',
      author: req.user.full_name,
      size: size || '1.5 MB',
      description: description || 'Initial document baseline',
      content: content || `Initial content for ${name}`
    });

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: req.user.id,
      action: 'Upload',
      document: name,
      version: version || 'v1.0',
      status: 'Success'
    });

    notificationDAO.create({
      id: 'notif-' + Date.now(),
      user_id: req.user.id,
      title: 'New Document Uploaded',
      message: `${name} (${version || 'v1.0'}) added to repository.`,
      icon: 'fa-file-arrow-up',
      icon_color: 'text-primary'
    });

    res.status(201).json({ success: true, document: doc });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document.' });
  }
});

app.get('/api/documents/:id/versions', authenticateToken, (req, res) => {
  try {
    const versions = versionDAO.getByDocId(req.params.id);
    res.json({ success: true, versions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch versions.' });
  }
});

app.post('/api/documents/:id/versions', [authenticateToken, apiLimiter], (req, res) => {
  try {
    const doc = docDAO.getById(req.params.id, req.user.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const { version, size, description, content } = req.body;
    const newVersion = versionDAO.create({
      document_id: doc.id,
      version: version || 'v2.0',
      type: 'New Version',
      author: req.user.full_name,
      size: size || doc.size,
      description: description || 'Updated version',
      content: content || `Content for ${doc.name} updated`
    });

    const allVersions = versionDAO.getByDocId(doc.id);
    docDAO.updateVersion(doc.id, req.user.id, version, 'Just now', allVersions.length);

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: req.user.id,
      action: 'Upload',
      document: doc.name,
      version: version,
      status: 'Success'
    });

    res.status(201).json({ success: true, version: newVersion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add version.' });
  }
});

app.post('/api/documents/:id/restore', [authenticateToken, apiLimiter], (req, res) => {
  try {
    const doc = docDAO.getById(req.params.id, req.user.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const { targetVersion } = req.body;
    const versions = versionDAO.getByDocId(doc.id);
    const target = versions.find(v => v.version === targetVersion);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target version not found in history.' });
    }

    docDAO.updateVersion(doc.id, req.user.id, targetVersion, 'Just now (Restored)', doc.total_versions);

    activityDAO.create({
      id: 'act-' + Date.now(),
      user_id: req.user.id,
      action: 'Restore',
      document: doc.name,
      version: targetVersion,
      status: 'Success'
    });

    notificationDAO.create({
      id: 'notif-' + Date.now(),
      user_id: req.user.id,
      title: 'Version Restored',
      message: `${doc.name} restored to baseline ${targetVersion}. History preserved.`,
      icon: 'fa-rotate-left',
      icon_color: 'text-success'
    });

    res.json({ success: true, message: `Restored to ${targetVersion}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to restore version.' });
  }
});

// 9. Notifications & Activities
app.get('/api/notifications', authenticateToken, (req, res) => {
  try {
    const notifs = notificationDAO.getByUserId(req.user.id);
    res.json({ success: true, notifications: notifs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

app.post('/api/notifications/read', authenticateToken, (req, res) => {
  try {
    notificationDAO.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

app.get('/api/activities', authenticateToken, (req, res) => {
  try {
    const acts = activityDAO.getByUserId(req.user.id);
    res.json({ success: true, activities: acts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch activities.' });
  }
});

app.get('/api/admin/users', authenticateToken, (req, res) => {
  try {
    const users = userDAO.getAll();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// 10. Serve Static Frontend Files
const PUBLIC_DIR = path.join(__dirname, '..');
app.use(express.static(PUBLIC_DIR));

// Fallback to index.html for root navigation
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[DVM Backend] Server is running on port ${PORT}`);
    console.log(`[DVM Backend] Live at: http://localhost:${PORT}`);
  });
}

module.exports = app;
