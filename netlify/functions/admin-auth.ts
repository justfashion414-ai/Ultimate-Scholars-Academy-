import crypto from 'crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_DB_ID = 'ai-studio-scholarsacademyg-ebf73b95-53a0-4ed1-9ffc-b16f8e56a9cc';
const HARDCODED_ADMINS = ['justfashion414@gmail.com', 'opadijoadeniyi20@gmail.com'];
const TEMP_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let cachedToken: { token: string; expiresAt: number } | null = null;
let certsCache: Record<string, string> | null = null;
let certsFetchedAt = 0;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('service account JSON is missing required fields');
  }
  return parsed as ServiceAccount;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/identitytoolkit',
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const input = `${header}.${payload}`;
  const privateKey = sa.private_key.includes('\\n') ? sa.private_key.replace(/\\n/g, '\n') : sa.private_key;
  const signatureB64 = crypto.createSign('RSA-SHA256').update(input).sign(privateKey, 'base64');
  const assertion = `${input}.${b64url(Buffer.from(signatureB64, 'base64'))}`;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error('Could not authenticate the school Firebase service account');
  }
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in) - 60) * 1000 };
  return cachedToken.token;
}

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && Date.now() - certsFetchedAt < 3600 * 1000) return certsCache;
  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new Error('could not fetch Google public certs');
  certsCache = await res.json();
  certsFetchedAt = Date.now();
  return certsCache;
}

function base64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

async function verifyIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('malformed authentication token');
  const header = JSON.parse(base64urlDecode(parts[0]).toString('utf8'));
  const payload = JSON.parse(base64urlDecode(parts[1]).toString('utf8'));
  const sa = loadServiceAccount();
  const expectedIssuer = `https://securetoken.google.com/${sa.project_id}`;
  if (payload.aud !== sa.project_id || (payload.iss !== expectedIssuer && payload.iss !== 'securetoken@system.gserviceaccount.com')) {
    throw new Error('authentication token does not belong to this school project');
  }
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
    throw new Error('authentication token has expired');
  }
  const certsMap = await getGoogleCerts();
  const certPem = certsMap[header.kid];
  if (!certPem) throw new Error('unknown token signing key');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  const x509 = new crypto.X509Certificate(certPem);
  const ok = verifier.verify(x509.publicKey, Buffer.from(parts[2], 'base64'));
  if (!ok) throw new Error('authentication token signature could not be verified');
  return { uid: payload.sub, email: (payload.email || '').toLowerCase() || undefined };
}

async function identityRequest(token: string, apiPath: string, body: any): Promise<any> {
  const sa = loadServiceAccount();
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}${apiPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || 'Firebase authentication request failed');
  }
  return data;
}

async function signUpWithPassword(email: string, password: string): Promise<{ localId: string }> {
  const webKey = process.env.VITE_FIREBASE_API_KEY;
  if (!webKey) throw new Error('Firebase web key is not configured');
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${webKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.localId) {
    throw new Error(data.error?.message || 'Could not create the account');
  }
  return data;
}

async function firestoreGet(token: string, path: string): Promise<any | null> {
  const sa = loadServiceAccount();
  const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB_ID}/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Could not read the school database');
  return res.json();
}

async function firestorePatchField(token: string, path: string, field: string, value: boolean): Promise<void> {
  const sa = loadServiceAccount();
  const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/${FIRESTORE_DB_ID}/documents/${path}?updateMask.fieldPaths=${field}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields: { [field]: { booleanValue: value } } })
  });
  if (!res.ok) throw new Error('Could not update the school database');
}

function generateTempPassword(): string {
  const bytes = crypto.randomBytes(10);
  let out = 'USA-';
  for (const b of bytes) out += TEMP_ALPHABET[b % TEMP_ALPHABET.length];
  return out;
}

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (body.action !== 'issue-temp-password') return json(400, { error: 'Unknown action' });

    const authHeader = (event.headers.authorization || event.headers.Authorization || '') as string;
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) return json(401, { error: 'Sign in as an administrator first.' });
    const caller = await verifyIdToken(idToken);
    if (!caller.email) return json(403, { error: 'Only administrators can issue temporary passwords.' });

    const token = await getAccessToken();

    const callerAdminDoc = await firestoreGet(token, `admins/${encodeURIComponent(caller.email)}`);
    const callerIsAdmin = HARDCODED_ADMINS.includes(caller.email) || !!callerAdminDoc;
    if (!callerIsAdmin) return json(403, { error: 'Only administrators can issue temporary passwords.' });

    const targetEmail = String(body.email || '').trim().toLowerCase();
    if (!targetEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(targetEmail)) {
      return json(400, { error: 'Provide a valid administrator email.' });
    }
    const targetAdminDoc = await firestoreGet(token, `admins/${encodeURIComponent(targetEmail)}`);
    if (!targetAdminDoc && !HARDCODED_ADMINS.includes(targetEmail)) return json(404, { error: `${targetEmail} is not on the authorized administrators list.` });

    const tempPassword = generateTempPassword();

    const lookup = await identityRequest(token, '/accounts:lookup', { email: [targetEmail] });
    const existing = lookup && Array.isArray(lookup.users) ? lookup.users[0] : null;
    let created = false;
    if (existing && existing.localId) {
      await identityRequest(token, '/accounts:update', {
        localId: existing.localId,
        password: tempPassword,
        emailVerified: true
      });
    } else {
      const createdUser = await signUpWithPassword(targetEmail, tempPassword);
      try {
        await identityRequest(token, '/accounts:update', {
          localId: createdUser.localId,
          emailVerified: true
        });
      } catch (e) {
        // The account exists and works; verification flag is best-effort.
      }
      created = true;
    }

    await firestorePatchField(token, `admins/${encodeURIComponent(targetEmail)}`, 'mustSetPassword', true);

    return json(200, { email: targetEmail, tempPassword, created });
  } catch (err: any) {
    return json(500, { error: err.message || 'Unexpected error issuing the temporary password.' });
  }
}
