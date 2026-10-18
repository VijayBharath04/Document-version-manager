/**
 * DOCUMENT VERSION MANAGER - SMS Dispatch Engine
 * Delivers real SMS verification codes to mobile devices via supported SMS gateways:
 * 1. Fast2SMS (India: https://www.fast2sms.com - Quick OTP route)
 * 2. Twilio (Global: https://www.twilio.com - Programmable Messaging)
 * 3. 2Factor (India: https://2factor.in - SMS OTP route)
 */

/**
 * Dispatches real SMS OTP to the target mobile number.
 * @param {string} phoneNumber - Full phone number including country code (e.g. +919876543210)
 * @param {string} otpCode - 6-digit numeric verification code
 * @returns {Promise<{success: boolean, provider: string, message: string, simulated?: boolean}>}
 */
async function sendSmsOtp(phoneNumber, otpCode) {
  // Normalize phone number
  const digits = phoneNumber.replace(/\D/g, '');
  const clean10Digits = digits.slice(-10);
  const e164 = phoneNumber.startsWith('+') ? phoneNumber : `+91${clean10Digits}`;

  // Track whether a real provider was configured but failed to deliver,
  // so we never silently pretend success after a provider error.
  let providerAttempted = false;
  const providerErrors = [];

  // 1. FAST2SMS (Optimized for India +91 mobile numbers)
  if (process.env.FAST2SMS_API_KEY && !process.env.FAST2SMS_API_KEY.includes('your_')) {
    providerAttempted = true;
    try {
      console.log(`[SMS Gateway: Fast2SMS] Dispatching OTP ${otpCode} to ${clean10Digits}...`);
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: clean10Digits
        })
      });

      const data = await response.json();
      console.log('[SMS Gateway: Fast2SMS] Response:', data);

      if (data && data.return === true) {
        return {
          success: true,
          provider: 'Fast2SMS',
          message: 'SMS verification code dispatched successfully via Fast2SMS.'
        };
      } else {
        console.error('[SMS Gateway: Fast2SMS] Provider error:', data);
        throw new Error(data.message && data.message[0] ? data.message[0] : 'Fast2SMS rejected dispatch.');
      }
    } catch (err) {
      console.error('[SMS Gateway: Fast2SMS] Dispatch failure:', err.message);
      providerErrors.push(`Fast2SMS: ${err.message}`);
      // Fall through to next provider or report error
    }
  }

  // 2. TWILIO (Global SMS delivery)
  // Real Twilio SIDs are "AC" + 32 hex characters; placeholder values like
  // ACXXXX... or "your_..." are rejected so they never count as configured.
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    /^AC[0-9a-fA-F]{32}$/.test(process.env.TWILIO_ACCOUNT_SID.trim()) &&
    !process.env.TWILIO_AUTH_TOKEN.includes('your_') &&
    /^\+\d{8,15}$/.test(process.env.TWILIO_PHONE_NUMBER.trim())
  ) {
    providerAttempted = true;
    try {
      console.log(`[SMS Gateway: Twilio] Dispatching OTP ${otpCode} to ${e164}...`);
      const authHeader = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const bodyParams = new URLSearchParams({
        To: e164,
        From: process.env.TWILIO_PHONE_NUMBER,
        Body: `Your Document Version Manager verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code.`
      });

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
      });

      const data = await response.json();
      console.log('[SMS Gateway: Twilio] Response:', data);

      if (response.ok && data.sid) {
        return {
          success: true,
          provider: 'Twilio',
          message: `SMS dispatched successfully via Twilio (SID: ${data.sid}).`
        };
      } else {
        throw new Error(data.message || 'Twilio rejected SMS delivery.');
      }
    } catch (err) {
      console.error('[SMS Gateway: Twilio] Dispatch failure:', err.message);
      providerErrors.push(`Twilio: ${err.message}`);
    }
  }

  // 3. 2FACTOR.IN (India SMS gateway)
  if (process.env.TWO_FACTOR_API_KEY && !process.env.TWO_FACTOR_API_KEY.includes('your_')) {
    providerAttempted = true;
    try {
      console.log(`[SMS Gateway: 2Factor] Dispatching OTP to ${clean10Digits}...`);
      const url = `https://2factor.in/v1/API/${process.env.TWO_FACTOR_API_KEY.trim()}/SMS/${clean10Digits}/${otpCode}/AUTOGEN`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.Status === 'Success') {
        return {
          success: true,
          provider: '2Factor',
          message: 'SMS dispatched successfully via 2Factor.'
        };
      }
      providerErrors.push('2Factor: provider rejected the dispatch request.');
    } catch (err) {
      console.error('[SMS Gateway: 2Factor] Dispatch failure:', err.message);
      providerErrors.push(`2Factor: ${err.message}`);
    }
  }

  // 4a. PROVIDERS CONFIGURED BUT ALL FAILED — fail loudly in every environment.
  if (providerAttempted) {
    const detail = providerErrors.join(' | ') || 'unknown provider error';
    console.error(`[SMS Gateway] All configured SMS providers failed: ${detail}`);
    throw new Error(
      `SMS delivery failed: ${detail}. No verification code was sent — please try again later.`
    );
  }

  // 4b. NO PROVIDER CONFIGURED — DEVELOPMENT FALLBACK ONLY
  //
  // In production (NODE_ENV=production) we refuse to pretend an SMS was sent:
  // the request fails with an honest error until real credentials are added.
  if (process.env.NODE_ENV === 'production') {
    console.error('[SMS Gateway] No SMS provider configured — refusing to simulate OTP delivery in production.');
    throw new Error(
      'SMS delivery is not configured on this server. Add SMS provider credentials (see .env.example) before enabling login.'
    );
  }

  // Development only: print the code to the SERVER terminal so the flow can be
  // exercised locally before SMS credits are purchased. It is never returned
  // in an HTTP response, never shown in the browser, and never logged by the frontend.
  console.log('\n================================================================================');
  console.log('📱 [DEV-ONLY OTP DISPATCH — NO SMS PROVIDER CONFIGURED]');
  console.log(`   Destination Mobile: ${e164}`);
  console.log(`   Verification Code:  ${otpCode} (Valid for 5 minutes)`);
  console.log('--------------------------------------------------------------------------------');
  console.log('ℹ️  NO SMS WAS SENT. To deliver real messages to physical phones:');
  console.log('   Add your SMS API key into .env in the project root:');
  console.log('   Option 1 (Fast2SMS - India): https://www.fast2sms.com -> Free Signup');
  console.log('     Add to .env: FAST2SMS_API_KEY=your_key_here');
  console.log('   Option 2 (Twilio - Global, $15 free trial): https://www.twilio.com');
  console.log('     Add to .env: TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_PHONE_NUMBER=...');
  console.log('   Option 3 (Supabase Phone Auth - PREFERRED): configure Authentication');
  console.log('     -> Providers -> Phone in your Supabase dashboard, then set SUPABASE_URL,');
  console.log('     SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.');
  console.log('================================================================================\n');

  return {
    success: true,
    provider: 'Dev-Console-Fallback',
    simulated: true,
    message: `Development mode: no SMS provider configured, so no SMS was sent to ${e164}. Check the server terminal for the code, or configure an SMS provider in .env.`
  };
}

module.exports = {
  sendSmsOtp
};
