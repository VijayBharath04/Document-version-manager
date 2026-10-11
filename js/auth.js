/**
 * DOCUMENT VERSION MANAGER - Real-Time Authentication Client
 * Connects frontend forms to backend SMS Gateway (Fast2SMS / Twilio / 2Factor)
 * Handles phone normalization, real SMS dispatch, secure OTP verification, and session state
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

    // Already includes international code
    if (/^\+[1-9]\d{9,14}$/.test(clean)) {
      return clean;
    }

    return null;
  },

  /**
   * Request real SMS OTP dispatch to the user's mobile number
   */
  async sendOtp(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }

    // Check resend cooldown
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: normalized })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.message || 'Failed to dispatch verification SMS.');
      }

      // Store mobile in session for OTP verification screen
      sessionStorage.setItem('dvm_phone', normalized);
      sessionStorage.setItem('dvm_otp_sent_at', Date.now().toString());
      localStorage.setItem('dvm_temp_mobile', normalized);

      // If simulated/dev fallback is active, save dev hint for developer testing
      if (data.simulated && data.devCode) {
        sessionStorage.setItem('dvm_dev_hint', data.devCode);
      } else {
        sessionStorage.removeItem('dvm_dev_hint');
      }

      return {
        success: true,
        phone: normalized,
        message: data.message,
        provider: data.provider,
        simulated: data.simulated
      };
    } catch (err) {
      console.error('[DVM Auth] Send OTP failed:', err);
      throw err;
    }
  },

  /**
   * Verify the 6-digit OTP code against the backend database
   */
  async verifyOtp(otpCode) {
    if (!otpCode || !/^\d{6}$/.test(otpCode.trim())) {
      throw new Error('Please enter all 6 digits of the verification code.');
    }

    const code = otpCode.trim();
    const phone = sessionStorage.getItem('dvm_phone') || localStorage.getItem('dvm_temp_mobile') || '+919876543210';

    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone,
          otp: code,
          name: 'Dinesh Kumar R'
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

      sessionStorage.removeItem('dvm_otp_sent_at');
      sessionStorage.removeItem('dvm_dev_hint');

      return { success: true, user: data.user };
    } catch (err) {
      console.error('[DVM Auth] Verify OTP failed:', err);
      throw err;
    }
  },

  /**
   * Resend OTP to the current phone number
   */
  async resendOtp() {
    const phone = sessionStorage.getItem('dvm_phone') || localStorage.getItem('dvm_temp_mobile');
    if (!phone) {
      throw new Error('No mobile number found. Please return to login.');
    }
    return await this.sendOtp(phone);
  },

  /**
   * Terminate session
   */
  async logout() {
    const token = localStorage.getItem('dvm_session_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (_) {}
    }

    localStorage.removeItem('dvm_session_token');
    localStorage.removeItem('dvm_logged_in');
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
};

window.DVM_AUTH = DVM_AUTH;
