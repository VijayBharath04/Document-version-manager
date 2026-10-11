/**
 * DOCUMENT VERSION MANAGER - Login Controller
 * Handles mobile validation and real-time SMS OTP initiation
 */

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, offer quick jump to dashboard
  if (DVM.isLoggedIn()) {
    const banner = document.getElementById('alreadyLoggedInBanner');
    if (banner) banner.style.display = 'block';
  }

  // Pre-initialize Auth provider
  if (window.DVM_AUTH) {
    try {
      await DVM_AUTH.init();
      DVM_AUTH.initRecaptcha('recaptcha-container');
    } catch (_) {}
  }

  const loginForm = document.getElementById('loginForm');
  const mobileInput = document.getElementById('mobileInput');
  const mobileError = document.getElementById('mobileError');

  if (!loginForm || !mobileInput) return;

  // Allow only digits and limit to 10
  mobileInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    if (mobileError) {
      mobileError.style.display = 'none';
      mobileError.textContent = '';
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = mobileInput.value.trim();

    // Indian mobile validation: exactly 10 digits, starts with 6, 7, 8, or 9
    const isValidIndianMobile = /^[6-9]\d{9}$/.test(val);

    if (!isValidIndianMobile) {
      if (mobileError) {
        mobileError.textContent = "Please enter a valid 10-digit mobile number.";
        mobileError.style.display = 'block';
      }
      mobileInput.focus();
      return;
    }

    const submitBtn = document.getElementById('sendOtpBtn') || loginForm.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : 'Send OTP';

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Sending OTP...';
      }

      // Call Authentication Provider
      const result = await DVM_AUTH.sendOtp(val, 'recaptcha-container');

      // Store mobile temporarily for OTP screen
      localStorage.setItem('dvm_temp_mobile', val);

      // Provide notification
      DVM.showToast('OTP Sent', `Verification code sent to +91 ******${val.slice(-4)}.`, 'success');

      setTimeout(() => {
        window.location.href = 'otp.html';
      }, 500);
    } catch (err) {
      console.error('Login dispatch error:', err);
      if (mobileError) {
        mobileError.textContent = err.message || 'Failed to dispatch verification code. Please try again.';
        mobileError.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });
});
