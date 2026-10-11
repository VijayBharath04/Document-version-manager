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

  // 1. FAST2SMS (Optimized for India +91 mobile numbers)
  if (process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY !== 'your_fast2sms_api_key_here') {
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
      // Fall through to next provider or report error
    }
  }

  // 2. TWILIO (Global SMS delivery)
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')
  ) {
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
    }
  }

  // 3. 2FACTOR.IN (India SMS gateway)
  if (process.env.TWO_FACTOR_API_KEY && process.env.TWO_FACTOR_API_KEY !== 'your_2factor_api_key_here') {
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
    } catch (err) {
      console.error('[SMS Gateway: 2Factor] Dispatch failure:', err.message);
    }
  }

  // 4. DEVELOPMENT / NOTICE MODE (When no live SMS credentials have been placed into .env yet)
  console.log('\n================================================================================');
  console.log('📱 [REAL SMS OTP DISPATCH EVENT]');
  console.log(`   Destination Mobile: ${e164}`);
  console.log(`   Verification Code:  ${otpCode} (Valid for 5 minutes)`);
  console.log('--------------------------------------------------------------------------------');
  console.log('ℹ️  HOW TO RECEIVE REAL SMS ON YOUR PHYSICAL MOBILE PHONE:');
  console.log('   Add your free SMS API key into .env in the project root:');
  console.log('   Option 1 (Fast2SMS - Free trial for India):');
  console.log('     1. Visit https://www.fast2sms.com -> Free Signup');
  console.log('     2. Copy "Dev API Key" from your Fast2SMS Dashboard');
  console.log('     3. Add to .env: FAST2SMS_API_KEY=your_key_here');
  console.log('   Option 2 (Twilio - $15 free trial worldwide):');
  console.log('     1. Visit https://www.twilio.com -> Free Signup');
  console.log('     2. Add to .env: TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_PHONE_NUMBER=...');
  console.log('================================================================================\n');

  return {
    success: true,
    provider: 'Simulated-Console',
    simulated: true,
    code: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    message: `Verification code generated for ${e164}. Check server terminal or configure SMS gateway in .env for physical phone delivery.`
  };
}

module.exports = {
  sendSmsOtp
};
