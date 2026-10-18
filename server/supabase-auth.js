/**
 * DOCUMENT VERSION MANAGER - Supabase Phone Authentication Module
 * Server-side integration with Supabase Auth (phone OTP)
 *
 * Uses the Supabase Admin client (service role key) to:
 *   - Trigger real SMS OTP via Supabase's configured SMS provider
 *   - Verify OTPs against Supabase Auth
 *   - Create/retrieve profile records in the local SQLite DB
 *     (Supabase is used for auth; SQLite for application data)
 *
 * The service role key NEVER reaches the browser.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL       = process.env.SUPABASE_URL       || '';
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Whether Supabase is properly configured.
 * Rejects obvious placeholder values.
 */
function isSupabaseConfigured() {
  const urlOk =
    SUPABASE_URL.startsWith('https://') &&
    SUPABASE_URL.includes('.supabase.co') &&
    !SUPABASE_URL.includes('your-project-ref');

  const keyOk =
    (SUPABASE_SERVICE_KEY.length > 100 && !SUPABASE_SERVICE_KEY.includes('your-service-role-key')) ||
    (SUPABASE_ANON_KEY.length > 100 && !SUPABASE_ANON_KEY.includes('your-anon-key'));

  return urlOk && keyOk;
}

/**
 * Admin Supabase client (service role key).
 * Used server-side ONLY — bypasses RLS for phone auth operations.
 */
function getAdminClient() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!key || !SUPABASE_URL) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.');
  }
  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Trigger real SMS OTP via Supabase phone auth.
 * Supabase will use its configured SMS provider (Twilio, MessageBird, etc.).
 *
 * @param {string} phone - E.164 format (e.g. +919876543210)
 * @returns {Promise<{success: boolean, message: string, provider: string}>}
 */
async function supabaseSendOtp(phone) {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const supabase = getAdminClient();

  // Use signInWithOtp to trigger SMS delivery
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: phone
  });

  if (error) {
    console.error('[Supabase OTP] Send failed:', error.message, error.status);

    // Map Supabase error codes to user-friendly messages
    if (error.status === 429 || error.message?.toLowerCase().includes('rate')) {
      throw new Error('Too many SMS requests. Please wait before requesting another OTP.');
    }
    if (error.message?.toLowerCase().includes('invalid phone')) {
      throw new Error('Invalid phone number format. Please use a valid mobile number with country code.');
    }
    if (error.message?.toLowerCase().includes('sms provider') || error.message?.toLowerCase().includes('provider')) {
      throw new Error('SMS provider is not configured in Supabase. Please configure a phone provider in your Supabase project dashboard.');
    }
    throw new Error(error.message || 'Failed to send OTP. Please try again.');
  }

  return {
    success: true,
    message: 'Verification code sent via Supabase SMS.',
    provider: 'Supabase'
  };
}

/**
 * Verify SMS OTP via Supabase phone auth.
 * Returns the authenticated Supabase user and session on success.
 *
 * @param {string} phone - E.164 format (e.g. +919876543210)
 * @param {string} token - 6-digit OTP entered by user
 * @returns {Promise<{user: object, session: object}>}
 */
async function supabaseVerifyOtp(phone, token) {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const supabase = getAdminClient();

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    token: token,
    type: 'sms'
  });

  if (error) {
    console.error('[Supabase OTP] Verify failed:', error.message, error.status);

    if (error.status === 400 || error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('expired')) {
      throw new Error('Invalid or expired verification code. Please check the code and try again.');
    }
    if (error.status === 429 || error.message?.toLowerCase().includes('rate')) {
      throw new Error('Too many verification attempts. Please request a new OTP.');
    }
    throw new Error(error.message || 'Verification failed. Please try again.');
  }

  if (!data?.user) {
    throw new Error('Verification did not return a valid user. Please try again.');
  }

  return {
    user: data.user,
    session: data.session
  };
}

/**
 * Retrieve the Supabase user from a given access token.
 * Used to validate incoming API requests that carry Supabase JWT tokens.
 *
 * @param {string} accessToken - Supabase access token from client
 * @returns {Promise<object|null>} Supabase user or null
 */
async function supabaseGetUser(accessToken) {
  if (!isSupabaseConfigured() || !accessToken) return null;

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Exchange a Supabase refresh token for a new session (access + refresh token).
 * Supabase rotates the refresh token on every use.
 *
 * @param {string} refreshToken - Refresh token issued at OTP verification
 * @returns {Promise<object>} New session object with access_token & refresh_token
 */
async function supabaseRefreshSession(refreshToken) {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data?.session) {
    throw new Error(error?.message || 'Refresh token is invalid or expired.');
  }

  return data.session;
}

/**
 * Idempotently create or update the user's row in the Supabase
 * public.profiles table (PostgreSQL, protected by RLS policies).
 *
 * Uses ON CONFLICT (id) DO UPDATE so repeated logins never create duplicates.
 * The service-role key bypasses RLS for this trusted server-side write.
 *
 * @param {{id: string, phone_number: string, full_name?: string, email?: string|null}} profile
 */
async function supabaseUpsertProfile(profile) {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  if (!profile?.id) {
    throw new Error('Profile id (Supabase auth UUID) is required.');
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: profile.id,
        phone_number: profile.phone_number,
        full_name: profile.full_name || 'SCM User',
        email: profile.email || null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to upsert profile.');
  }
}

module.exports = {
  isSupabaseConfigured,
  supabaseSendOtp,
  supabaseVerifyOtp,
  supabaseGetUser,
  supabaseRefreshSession,
  supabaseUpsertProfile
};
