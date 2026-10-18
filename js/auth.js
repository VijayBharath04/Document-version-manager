/**
 * DOCUMENT VERSION MANAGER - Authentication Client
 * Connects frontend forms to the backend SMS Gateway.
 * Supports both:
 *   - Supabase Phone Auth (when server is configured with SUPABASE credentials)
 *   - Custom SMS providers: Fast2SMS / Twilio / 2Factor (fallback)
 *
 * SECURITY:
 *   - The OTP code is NEVER displayed on screen, in source, or in the console.
 *   - Session tokens are stored in localStorage; refresh tokens are stored separately.
 *   - The Supabase service role key is NEVER exposed to the browser.
 */

const DVM_AUTH = {
  resendCooldownSeconds: 60,

  /**
   * Normalize input mobile number to strict E.164 format (+91XXXXXXXXXX)
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    const clean = phone.trim().replace(/[^\d+]/g, '');

    // 10-digit Indian mobile number
    if (/^[6-9]\d{9}$/.test(clean)) {
      return `+91${clean}`;
    }

    // Already includes international code (+91XXXXXXXXXX)
    if (/^\+[1-9]\d{9,14}$/.test(clean)) {
      return clean;
    }

    return null;
  },

  /**
   * Request real SMS OTP dispatch to the user's mobile number.
   * Calls the backend /api/auth/send-otp which uses Supabase or custom SMS providers.
   * The OTP code is NEVER returned in the response — it is only ever sent via SMS.
   */
  async sendOtp(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Client-side cooldown check (also enforced server-side)
    const lastSent = sessionStorage.getItem('dvm_otp_sent_at');
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent, 10)) / 1000);
      if (elapsed < this.resendCooldownSeconds) {
        throw new Error(`Please wait ${this.resendCooldownSeconds - elapsed} seconds before requesting a new OTP.`);
      }
    }

    try {
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch verification SMS.');
      }

      // Store phone and timing for OTP verification screen
      sessionStorage.setItem('dvm_phone', normalized);
      sessionStorage.setItem('dvm_otp_sent_at', Date.now().toString());
      sessionStorage.setItem('dvm_auth_mode', data.authMode || 'custom');
      localStorage.setItem('dvm_temp_mobile', normalized);

      // SECURITY: dvm_dev_hint is intentionally NOT stored.
      // Check the server terminal to see OTP in simulated/dev mode.

      return {
        success: true,
        phone: normalized,
        message: data.message,
        provider: data.provider,
        simulated: data.simulated === true,
        authMode: data.authMode
      };
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Cannot connect to the server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  /**
   * Verify the 6-digit OTP code against the backend.
   * Uses the real Supabase verifyOtp or custom SQLite OTP verification—
   * never a frontend-only comparison.
   *
   * On success: stores the session token and user profile.
   * On failure: throws an error with a user-friendly message.
   */
  async verifyOtp(otpCode) {
    if (!otpCode || !/^\d{6}$/.test(otpCode.trim())) {
      throw new Error('Please enter all 6 digits of the verification code.');
    }

    const code = otpCode.trim();
    const phone = sessionStorage.getItem('dvm_phone') || localStorage.getItem('dvm_temp_mobile');
    const authMode = sessionStorage.getItem('dvm_auth_mode') || 'custom';

    if (!phone) {
      throw new Error('No mobile number found. Please return to the login page.');
    }

    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          otp: code,
          authMode: authMode
        })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.message || 'Verification failed. Please check the OTP code.');
      }

      // Store authenticated session
      localStorage.setItem('dvm_session_token', data.token);
      localStorage.setItem('dvm_logged_in', 'true');
      localStorage.setItem('dvm_user', JSON.stringify(data.user));
      localStorage.setItem('dvm_auth_mode', data.authMode || authMode);

      // Store Supabase refresh token separately for session restoration
      if (data.refreshToken) {
        localStorage.setItem('dvm_refresh_token', data.refreshToken);
      }

      // Clean up OTP session state
      sessionStorage.removeItem('dvm_otp_sent_at');
      sessionStorage.removeItem('dvm_auth_mode');

      return { success: true, user: data.user, authMode: data.authMode };
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Cannot connect to the server. Please ensure the server is running.');
      }
      throw err;
    }
  },

  /**
   * Resend OTP to the current phone number.
   * Resets the cooldown timer.
   */
  async resendOtp() {
    const phone = sessionStorage.getItem('dvm_phone') || localStorage.getItem('dvm_temp_mobile');
    if (!phone) {
      throw new Error('No mobile number found. Please return to the login page.');
    }
    // Clear cooldown so sendOtp doesn't block the resend
    sessionStorage.removeItem('dvm_otp_sent_at');
    return await this.sendOtp(phone);
  },

  /**
   * Attempt to restore the authenticated session from stored tokens.
   * Validates the stored token against the server (/api/auth/me).
   *
   * If the access token has expired, the stored Supabase refresh token is
   * exchanged for a fresh session via /api/auth/refresh before re-validating.
   *
   * Returns the user object on success, null if the session is expired/invalid.
   */
  async restoreSession() {
    const token = localStorage.getItem('dvm_session_token');
    if (!token) return null;

    try {
      let resp = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Access token expired → try to refresh it, then re-validate.
      if (resp.status === 401 || resp.status === 403) {
        const refreshed = await this.refreshSession();
        if (!refreshed) {
          this._clearSessionData();
          return null;
        }
        resp = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('dvm_session_token')}` }
        });
      }

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.user) {
          localStorage.setItem('dvm_logged_in', 'true');
          localStorage.setItem('dvm_user', JSON.stringify(data.user));
          return data.user;
        }
      }
      // Token invalid or expired — clear session
      this._clearSessionData();
      return null;
    } catch (_) {
      // Server unreachable — keep existing local session state for offline resilience
      return null;
    }
  },

  /**
   * Exchange the stored Supabase refresh token for a new access token.
   * Returns true on success, false otherwise.
   */
  async refreshSession() {
    const refreshToken = localStorage.getItem('dvm_refresh_token');
    if (!refreshToken) return false;

    try {
      const resp = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!resp.ok) return false;

      const data = await resp.json();
      if (!data.success || !data.token) return false;

      localStorage.setItem('dvm_session_token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('dvm_refresh_token', data.refreshToken);
      }
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Terminate the authenticated session.
   * Calls the server logout endpoint to invalidate the session,
   * then clears all local storage.
   */
  async logout() {
    const token = localStorage.getItem('dvm_session_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (_) {
        // Logout proceeds even if server is unreachable
      }
    }

    this._clearSessionData();
    window.location.href = 'login.html';
  },

  /**
   * Internal: Clear all auth-related storage.
   */
  _clearSessionData() {
    localStorage.removeItem('dvm_session_token');
    localStorage.removeItem('dvm_refresh_token');
    localStorage.removeItem('dvm_logged_in');
    localStorage.removeItem('dvm_auth_mode');
    localStorage.removeItem('dvm_temp_mobile');
    sessionStorage.clear();
  },

  // Legacy stubs — kept for backward compatibility with existing code that calls these
  init() { return Promise.resolve(); },
  initRecaptcha() {}
};

window.DVM_AUTH = DVM_AUTH;
