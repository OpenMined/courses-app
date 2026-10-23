import admin from 'firebase-admin';
import * as functions from 'firebase-functions';

// Accounts are created here, not in the browser, so every sign-up passes a
// Cloudflare Turnstile check. Client-side sign-up is switched off in Firebase
// Auth (Settings → User actions), which closes the public API to bots.
export const SIGNUP_SECRETS = ['TURNSTILE_SECRET_KEY'];

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Mirrors the sign-up form's rules (apps/courses/src/components/forms/_validation.ts)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 7;
const MAX_NAME_LENGTH = 100;

const invalid = (message: string) =>
  new functions.https.HttpsError('invalid-argument', message);

const cleanName = (value: unknown, label: string) => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name) throw invalid(`${label} is required.`);
  if (name.length > MAX_NAME_LENGTH) throw invalid(`${label} is too long.`);
  return name;
};

const verifyTurnstile = async (token: unknown, ip?: string) => {
  if (typeof token !== 'string' || !token) return false;

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY || '',
    response: token,
  });
  if (ip) body.append('remoteip', ip);

  // Node 22 has a global fetch; the TypeScript version here predates its types
  const response = await (globalThis as any).fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body,
  });
  const result = await response.json();

  return result.success === true;
};

export const createAccount = async (data, context) => {
  const email =
    typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
  const password = typeof data?.password === 'string' ? data.password : '';

  if (!EMAIL_PATTERN.test(email)) throw invalid('Enter a valid email address.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw invalid(
      `Passwords must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }
  const first_name = cleanName(data?.first_name, 'First name');
  const last_name = cleanName(data?.last_name, 'Last name');

  const human = await verifyTurnstile(
    data?.turnstile_token,
    context.rawRequest?.ip
  );
  if (!human) {
    functions.logger.info('Sign-up rejected: Turnstile check failed');
    throw new functions.https.HttpsError(
      'permission-denied',
      'We could not verify the sign-up. Please try again.'
    );
  }

  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().createUser({
      email,
      password,
      displayName: `${first_name} ${last_name}`,
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'An account with this email already exists.'
      );
    }
    throw error;
  }

  await admin.firestore().collection('users').doc(user.uid).set({
    first_name,
    last_name,
    notification_preferences: ['project_reviews'],
  });

  return { uid: user.uid };
};
