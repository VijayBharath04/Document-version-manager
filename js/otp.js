/**
 * DOCUMENT VERSION MANAGER - Real-Time OTP Verification Controller
 * Handles 6-box input navigation, paste events, countdown cooldown, and authentic verification
 */

document.addEventListener('DOMContentLoaded', async () => {
  const tempMobile = localStorage.getItem('dvm_temp_mobile') || sessionStorage.getItem('dvm_phone') || '';
  const maskedMobileEl = document.getElementById('maskedMobile');
  if (maskedMobileEl) {
    const digits = tempMobile.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    maskedMobileEl.textContent = last4 ? `+91 ******${last4}` : '+91 ******XXXX';
  }

  // Redirect to login if no phone in session
  if (!tempMobile) {
    window.location.href = 'login.html';
    return;
  }

  const otpInputs = document.querySelectorAll('.otp-box');
  const otpForm = document.getElementById('otpForm');
  const otpError = document.getElementById('otpError');
  const otpSuccess = document.getElementById('otpSuccess');
  const timerCountEl = document.getElementById('timerCount');
  const timerWrapper = document.getElementById('timerWrapper');
  const resendBtn = document.getElementById('resendBtn');
  const verifyBtn = document.getElementById('verifyBtn');

  // Focus first input automatically
  if (otpInputs.length > 0) {
    setTimeout(() => otpInputs[0].focus(), 150);
  }

  // Handle Box Navigation
  otpInputs.forEach((input, index) => {
    // Only accept numeric inputs
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val ? val[0] : '';

      if (e.target.value) {
        input.classList.add('is-filled');
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        } else {
          // All 6 boxes filled -> auto verify
          checkAndSubmitOTP();
        }
      } else {
        input.classList.remove('is-filled');
      }
      if (otpError) otpError.style.display = 'none';
    });

    // Handle backspace navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          otpInputs[index - 1].focus();
          otpInputs[index - 1].value = '';
          otpInputs[index - 1].classList.remove('is-filled');
        }
      }
    });

    // Handle paste event (e.g. user copies 6-digit code)
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      if (pastedData.length > 0) {
        pastedData.split('').forEach((char, i) => {
          if (otpInputs[i]) {
            otpInputs[i].value = char;
            otpInputs[i].classList.add('is-filled');
          }
        });
        const nextIndex = Math.min(pastedData.length, otpInputs.length - 1);
        otpInputs[nextIndex].focus();
        if (pastedData.length === 6) {
          checkAndSubmitOTP();
        }
      }
    });
  });

  // Verify function
  let isSubmitting = false;
  async function checkAndSubmitOTP() {
    if (isSubmitting) return;

    let enteredCode = '';
    otpInputs.forEach(input => {
      enteredCode += input.value;
    });

    if (enteredCode.length !== 6) {
      if (otpError) {
        otpError.textContent = "Please enter all 6 digits of the verification code.";
        otpError.style.display = 'block';
      }
      return;
    }

    isSubmitting = true;
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Verifying...';
    }
    if (otpError) otpError.style.display = 'none';

    try {
      // Secure verification through Authentication Provider
      const result = await DVM_AUTH.verifyOtp(enteredCode);

      if (otpSuccess) otpSuccess.style.display = 'flex';
      if (verifyBtn) {
        verifyBtn.innerHTML = '<i class="fa-solid fa-circle-check me-2"></i> Verified! Redirecting...';
      }

      // Sync user info into DVM engine
      if (result && result.user) {
        DVM.login(result.user.phone_number || tempMobile);
        if (result.user.full_name) {
          DVM.updateUser(result.user);
        }
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    } catch (err) {
      console.error('[OTP Verify] Failed:', err);
      isSubmitting = false;

      if (otpError) {
        otpError.textContent = err.message || "Invalid verification code. Please try again.";
        otpError.style.display = 'block';
      }

      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<i class="fa-solid fa-shield-check me-1"></i> Verify OTP';
      }

      // Shake animation
      const container = document.querySelector('.otp-container');
      if (container) {
        container.style.animation = 'none';
        container.offsetHeight; // trigger reflow
        container.style.animation = 'shake 0.4s ease';
      }

      // Highlight boxes red briefly
      otpInputs.forEach(inp => inp.style.borderColor = '#ef4444');
      setTimeout(() => {
        otpInputs.forEach(inp => inp.style.borderColor = '');
      }, 1000);
    }
  }

  // Form submit button
  if (otpForm) {
    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      checkAndSubmitOTP();
    });
  }

  // Resend Countdown Timer (60s cooldown)
  let timerInterval = null;
  function startTimer(duration = 60) {
    if (timerInterval) clearInterval(timerInterval);
    if (resendBtn) resendBtn.style.display = 'none';
    if (timerWrapper) timerWrapper.style.display = 'block';

    let timeLeft = duration;
    if (timerCountEl) timerCountEl.textContent = timeLeft;

    timerInterval = setInterval(() => {
      timeLeft--;
      if (timerCountEl) timerCountEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        if (timerWrapper) timerWrapper.style.display = 'none';
        if (resendBtn) resendBtn.style.display = 'inline-block';
      }
    }, 1000);
  }

  startTimer(60);

  // Resend OTP Action
  if (resendBtn) {
    resendBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const originalHtml = resendBtn.innerHTML;
      try {
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Sending...';
        await DVM_AUTH.resendOtp();
        DVM.showToast('OTP Dispatched', 'A new verification code has been dispatched via SMS.', 'success');
        startTimer(60);
      } catch (resendErr) {
        console.error('[Resend OTP] Failed:', resendErr);
        DVM.showToast('Resend Failed', resendErr.message || 'Failed to dispatch new OTP.', 'danger');
      } finally {
        resendBtn.disabled = false;
        resendBtn.innerHTML = originalHtml;
      }
    });
  }
});
