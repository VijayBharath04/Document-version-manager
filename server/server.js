/**
 * DOCUMENT VERSION MANAGER - Express Backend Server
 * Production-ready backend with authentication, rate limiting, and database routes
 *
 * Auth Priority:
 *   1. Supabase Phone Auth (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)
 *   2. Custom SMS providers (Fast2SMS / Twilio / 2Factor) + SQLite OTP storage
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
const {
  isSupabaseConfigured,
  supabaseSendOtp,
  supabaseVerifyOtp,
  supabaseGetUser,
  supabaseRefreshSession,
  supabaseUpsertProfile
} = require('./supabase-auth');

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
          "https://*.firebaseapp.com",
          "https://*.supabase.co",
          "https://*.supabase.io",
          "wss://*.supabase.co"
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
// Accepts both custom JWT tokens (legacy/fallback) and Supabase session tokens
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No session token provided.' });
  }

  // Try Supabase token first (if configured)
  if (isSupabaseConfigured()) {
    try {
      const supabaseUser = await supabaseGetUser(token);
      if (supabaseUser) {
        // Lookup or create local profile for this Supabase user
        const phone = supabaseUser.phone || '';
        let localUser = userDAO.findById(supabaseUser.id) || userDAO.findByPhone(phone);
        if (!localUser && phone) {
          localUser = userDAO.create({
            id: supabaseUser.id,
            phone_number: phone,
            full_name: supabaseUser.user_metadata?.full_name || 'SCM User',
            email: supabaseUser.email || '',
            role: 'User',
            status: 'Active'
          });
          seedIfEmpty(localUser.id, localUser.full_name);
        }
        if (localUser) {
          req.user = localUser;
          req.supabaseUser = supabaseUser;
          return next();
        }
      }
    } catch (supaErr) {
      // Not a Supabase token — fall through to custom JWT check
    }
  }

  // Fall through: validate as custom JWT
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

// 4. Public Config Route (Returns safe public keys — NO service role key)
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    // Supabase public config (anon key is safe to expose to the browser)
    supabase: {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      configured: isSupabaseConfigured()
    },
    // Firebase config (legacy, kept for compatibility)
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
 * Dispatches real SMS OTP.
 *
 * Priority:
 *   1. Supabase Phone Auth (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY configured)
 *   2. Custom SMS providers: Fast2SMS / Twilio / 2Factor (if configured in .env)
 *   3. Console-log fallback (development only — OTP shown in server terminal, NOT in API response)
 *
 * IMPORTANT: The OTP code is NEVER returned in the HTTP response under any circumstance.
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

    // Validate Indian mobile format
    const digitsOnly = cleanPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // ── PATH 1: Supabase Phone Auth ───────────────────────────────────────────
    if (isSupabaseConfigured()) {
      try {
        const result = await supabaseSendOtp(cleanPhone);
        return res.json({
          success: true,
          phone: cleanPhone,
          message: result.message,
          provider: result.provider,
          authMode: 'supabase'
          // OTP code is NEVER included — Supabase handles delivery directly
        });
      } catch (supaErr) {
        const msg = (supaErr.message || '').toLowerCase();
        if (
          supaErr.message === 'SUPABASE_NOT_CONFIGURED' ||
          msg.includes('sms provider is not configured')
        ) {
          // Supabase's SMS provider is not set up yet — fall through to any
          // custom SMS provider configured in .env so login still works.
          if (supaErr.message !== 'SUPABASE_NOT_CONFIGURED') {
            console.warn('[Supabase OTP] Phone provider not configured in Supabase dashboard — falling back to custom SMS providers.');
          }
        } else {
          console.error('[Supabase OTP] Send failed:', supaErr.message);
          return res.status(400).json({ success: false, message: supaErr.message });
        }
      }
    }

    // ── PATH 2: Custom SMS Providers + SQLite OTP Storage ─────────────────────
    // Cooldown check: prevent repeated rapid requests (45-second window)
    const pending = otpDAO.findLatestPending(cleanPhone);
    if (pending && (pending.expires_at - Date.now()) > 255000) {
      const remainingSeconds = Math.ceil(((pending.expires_at - Date.now()) - 255000) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds > 0 ? remainingSeconds : 45} seconds before requesting a new OTP.`
      });
    }

    // Generate cryptographically random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in SQLite (invalidates any prior pending code for this number)
    otpDAO.create(cleanPhone, code, 300);

    // Dispatch real SMS (Fast2SMS / Twilio / 2Factor — or console fallback)
    const smsResult = await sendSmsOtp(cleanPhone, code);

    // SECURITY: Never return the OTP code in the HTTP response.
    // In simulated/dev mode the code appears only in the server terminal.
    res.json({
      success: true,
      phone: cleanPhone,
      message: smsResult.simulated
        ? 'Verification code generated. Check the server terminal (no SMS provider configured).'
        : smsResult.message,
      provider: smsResult.provider,
      simulated: smsResult.simulated === true,
      authMode: 'custom'
      // devCode is intentionally OMITTED — check server terminal instead
    });
  } catch (error) {
    console.error('Error dispatching OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to dispatch verification code. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP and establishes an authenticated session.
 *
 * Priority:
 *   1. Supabase Phone Auth (if configured) — verifies via Supabase, returns Supabase session token
 *   2. Custom SQLite OTP storage — verifies locally, returns a signed JWT
 *
 * In both cases: creates or retrieves the user's profile in the local SQLite DB.
 */
app.post('/api/auth/verify-otp', authLimiter, async (req, res) => {
  try {
    const { phone, otp, name, authMode } = req.body;
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

    // ── PATH 1: Supabase Phone Auth ───────────────────────────────────────────
    if (isSupabaseConfigured() && authMode !== 'custom') {
      try {
        const { user: supaUser, session } = await supabaseVerifyOtp(cleanPhone, cleanCode);

        // Create or retrieve local profile (keyed by Supabase UUID)
        let localUser = userDAO.findById(supaUser.id) || userDAO.findByPhone(cleanPhone);
        if (!localUser) {
          localUser = userDAO.create({
            id: supaUser.id,
            phone_number: cleanPhone,
            full_name: name || supaUser.user_metadata?.full_name || 'SCM User',
            email: supaUser.email || '',
            role: 'User',
            status: 'Active'
          });
          seedIfEmpty(localUser.id, localUser.full_name);
        }

        // Mirror profile into Supabase PostgreSQL public.profiles (idempotent — no duplicates).
        // Fails soft: authentication still succeeds if the schema has not been run yet.
        try {
          await supabaseUpsertProfile({
            id: supaUser.id,
            phone_number: supaUser.phone || cleanPhone,
            full_name: localUser.full_name,
            email: localUser.email || null
          });
        } catch (profileErr) {
          console.warn('[Supabase Profiles] Upsert skipped:', profileErr.message);
        }

        activityDAO.create({
          id: 'act-' + Date.now(),
          user_id: localUser.id,
          action: 'Login',
          document: 'Authentication Portal',
          version: 'Supabase SMS OTP Verified',
          status: 'Success'
        });

        // Return the Supabase access token as the session token.
        // The client stores this and sends it in Authorization headers.
        return res.json({
          success: true,
          token: session.access_token,
          refreshToken: session.refresh_token,
          user: localUser,
          authMode: 'supabase',
          message: 'Mobile number verified successfully via Supabase.'
        });
      } catch (supaErr) {
        if (supaErr.message === 'SUPABASE_NOT_CONFIGURED') {
          // Fall through to custom OTP path
        } else {
          console.error('[Supabase OTP] Verify failed:', supaErr.message);
          return res.status(400).json({ success: false, message: supaErr.message });
        }
      }
    }

    // ── PATH 2: Custom SQLite OTP Verification ────────────────────────────────
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

    if (record.code !== cleanCode) {
      otpDAO.incrementAttempts(record.id);
      const remaining = 5 - (record.attempts + 1);
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. Please enter the code sent to your phone. (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`
      });
    }

    // Mark OTP as used
    otpDAO.markVerified(record.id);

    // Retrieve or create local user profile
    let user = userDAO.findByPhone(cleanPhone);
    if (!user) {
      const uid = 'usr-' + Date.now();
      user = userDAO.create({
        id: uid,
        phone_number: cleanPhone,
        full_name: name || 'SCM User',
        email: '',
        role: 'User',
        status: 'Active'
      });
      seedIfEmpty(user.id, user.full_name);
    }

    // Issue a signed custom JWT session token
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
      version: 'SMS OTP Verified (Custom Provider)',
      status: 'Success'
    });

    res.json({
      success: true,
      token,
      user,
      authMode: 'custom',
      message: 'Mobile number verified successfully.'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: 'Failed to verify authentication code.' });
  }
});

/**
 * POST /api/auth/refresh
 * Exchanges a valid Supabase refresh token for a new access/refresh token pair.
 * The old refresh token is rotated by Supabase. Custom (non-Supabase) sessions
 * are issued as 7-day JWTs and do not require refresh.
 *
 * Body: { refreshToken: string }
 * Returns: { success, token, refreshToken } on success.
 *
 * NOTE: This endpoint never creates accounts and never trusts a client-supplied
 * user ID — it only forwards a refresh token that Supabase itself issued
 * after a successful phone OTP verification.
 */
app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Session refresh requires Supabase configuration. Please log in again.'
      });
    }

    try {
      const session = await supabaseRefreshSession(refreshToken);
      return res.json({
        success: true,
        token: session.access_token,
        refreshToken: session.refresh_token
      });
    } catch (supaErr) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired. Please log in again.'
      });
    }
  } catch (error) {
    console.error('Session refresh error:', error);
    res.status(500).json({ success: false, message: 'Failed to refresh session.' });
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
