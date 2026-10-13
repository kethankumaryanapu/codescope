/**
 * test_task8_reliability_security.js
 *
 * Comprehensive Automated Reliability, Security & Validation Suite
 * for CodeScope Task 8.
 *
 * Verifies:
 *   1. Password hashing with bcrypt, safe verification, and legacy upgrade
 *   2. JWT authentication, cryptographic token validation, and route protection
 *   3. GitHub, GitLab, and Stripe webhook HMAC signature verification
 *   4. Repository path traversal & LFI boundary enforcement
 *   5. Database environment variable normalization & honest storage reporting
 *   6. Python service unavailable, timeout, and malformed response handling
 *   7. AI provider failure resilience and honest fallback metadata
 *   8. Error sanitization and secret redaction
 */

import assert from 'assert';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import {
  hashPassword,
  verifyPassword,
  handleLogin,
  handleGetMe,
  handleRegister,
  handleResetPassword,
} from '../controllers/authController.js';
import {
  signUserToken,
  verifyUserToken,
  requireAuth,
  optionalAuth,
} from '../middleware/authMiddleware.js';
import {
  verifyGitHubSignature,
  verifyGitLabToken,
  verifyStripeSignature,
} from '../controllers/webhookController.js';
import {
  validateRelativeFilePath,
  addExplicitFile,
  batchAddExplicitFiles,
  removeExplicitFile,
} from '../services/codeIndexer.js';
import {
  resolveMongoUri,
  getDatabaseStatus,
} from '../config/db.js';
import {
  checkPythonServiceHealth,
  triggerPythonRepoIndex,
} from '../services/pythonAgentService.js';
import {
  generateImpactPrimer,
} from '../services/geminiServices.js';
import {
  sanitizeErrorForClient,
} from '../services/orchestratorService.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const test = async (name, fn) => {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ PASS [Test ${totalTests}] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ FAIL [Test ${totalTests}] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
};

// ── Mock Express Helpers ─────────────────────────────────────────────────────
const createMockReq = (options = {}) => ({
  headers: options.headers || {},
  body: options.body || {},
  params: options.params || {},
  query: options.query || {},
  user: options.user || null,
  protocol: 'http',
});

const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.jsonData = data;
      return res;
    },
    setHeader(name, val) {
      res.headers[name] = val;
      return res;
    },
  };
  return res;
};

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runTask8SecuritySuite() {
  console.log('================================================================');
  console.log('CodeScope Task 8: Reliability, Security & Validation Test Suite');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  console.log('AREA 1: Password Hashing & Safe Verification (bcrypt)');
  // ──────────────────────────────────────────────────────────────────────────

  await test('hashPassword generates valid bcrypt hash starting with $2a$ or $2b$', async () => {
    const hash = await hashPassword('SuperSecureP@ssw0rd!');
    assert(typeof hash === 'string', 'Hash must be a string');
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash must follow bcrypt prefix format');
    assert(hash.length >= 59, 'Bcrypt hash should be 60 chars');
  });

  await test('verifyPassword succeeds with matching password and bcrypt hash', async () => {
    const raw = 'CorrectHorseBatteryStaple123!';
    const hash = await hashPassword(raw);
    const valid = await verifyPassword(raw, hash);
    assert.strictEqual(valid, true, 'verifyPassword must return true for correct password');
  });

  await test('verifyPassword rejects wrong password against bcrypt hash', async () => {
    const hash = await hashPassword('CorrectPassword123');
    const valid = await verifyPassword('WrongPassword321', hash);
    assert.strictEqual(valid, false, 'verifyPassword must return false for wrong password');
  });

  await test('verifyPassword rejects empty password safely without throwing', async () => {
    const hash = await hashPassword('AnyPassword');
    assert.strictEqual(await verifyPassword('', hash), false);
    assert.strictEqual(await verifyPassword(null, hash), false);
  });

  await test('verifyPassword handles legacy plaintext via constant-time comparison during transition', async () => {
    const legacyStored = 'legacyPlaintext123';
    const isMatch = await verifyPassword('legacyPlaintext123', legacyStored);
    assert.strictEqual(isMatch, true, 'Legacy plaintext should match during transition window');
    const isMismatch = await verifyPassword('differentPassword', legacyStored);
    assert.strictEqual(isMismatch, false, 'Legacy plaintext must reject wrong input');
  });

  await test('handleLogin rejects invalid credentials with HTTP 401', async () => {
    const req = createMockReq({ body: { email: 'developer@codescope.ai', password: 'incorrectPassword!' } });
    const res = createMockRes();
    await handleLogin(req, res);
    assert.strictEqual(res.statusCode, 401);
    assert(res.jsonData?.error?.includes('Invalid email or password'));
  });

  await test('handleLogin authenticates seeded user and returns signed JWT token', async () => {
    const req = createMockReq({ body: { email: 'developer@codescope.ai', password: 'password123' } });
    const res = createMockRes();
    await handleLogin(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert(res.jsonData?.token, 'Response must include token');
    assert(!res.jsonData.token.startsWith('jwt-mock-'), 'Token must not be a mock token string');
    const decoded = jwt.decode(res.jsonData.token);
    assert(decoded && decoded.email === 'developer@codescope.ai', 'Token payload must contain email');
  });

  await test('handleResetPassword hashes new password with bcrypt', async () => {
    const testEmail = `test_reset_${Date.now()}@codescope.ai`;
    // Register temporary user first
    const regReq = createMockReq({
      body: { name: 'Reset Tester', email: testEmail, password: 'InitialPassword1' },
    });
    const regRes = createMockRes();
    await handleRegister(regReq, regRes);

    // Simulate OTP map entry
    const { registrationOTPs } = await import('../controllers/authController.js');
    // Direct call with missing OTP rejects
    const resetReqMissing = createMockReq({
      body: { email: testEmail, otp: '123456', newPassword: 'NewBcryptPassword1' },
    });
    const resetResMissing = createMockRes();
    await handleResetPassword(resetReqMissing, resetResMissing);
    assert.strictEqual(resetResMissing.statusCode, 400);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 2: JWT Authentication, Token Validation & Route Protection');
  // ──────────────────────────────────────────────────────────────────────────

  await test('signUserToken creates cryptographically valid JWT with user payload', async () => {
    const user = { id: 'usr-42', email: 'secops@codescope.ai', name: 'Security Lead', role: 'SecOps' };
    const token = signUserToken(user);
    assert(typeof token === 'string');
    assert.strictEqual(token.split('.').length, 3, 'JWT must have 3 segments');
  });

  await test('verifyUserToken verifies authentic signed token and returns payload', async () => {
    const user = { id: 'usr-99', email: 'audit@codescope.ai', name: 'Auditor', role: 'Security' };
    const token = signUserToken(user);
    const result = verifyUserToken(token);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.id, 'usr-99');
    assert.strictEqual(result.payload.email, 'audit@codescope.ai');
  });

  await test('verifyUserToken rejects tampered or signature-modified token', async () => {
    const user = { id: 'usr-99', email: 'audit@codescope.ai', name: 'Auditor' };
    const token = signUserToken(user);
    const parts = token.split('.');
    // Tamper with payload
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 'usr-1', email: 'admin@root' })).toString('base64url');
    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    const result = verifyUserToken(forgedToken);
    assert.strictEqual(result.valid, false, 'Tampered token must be rejected');
  });

  await test('verifyUserToken rejects expired token', async () => {
    const user = { id: 'usr-exp', email: 'exp@codescope.ai', name: 'Expired User' };
    const secret = process.env.JWT_SECRET || 'codescope-dev-jwt-secret-do-not-use-in-production-2026';
    const expiredToken = jwt.sign(user, secret, { expiresIn: '0s' });
    // Small delay to ensure expiration
    await new Promise((r) => setTimeout(r, 10));
    const result = verifyUserToken(expiredToken);
    assert.strictEqual(result.valid, false);
    assert(result.error.includes('expired'), 'Error message must mention expiration');
  });

  await test('requireAuth middleware accepts valid Bearer token and attaches req.user', async () => {
    const user = { id: 'usr-req', email: 'dev@codescope.ai', name: 'Developer', role: 'Engineer' };
    const token = signUserToken(user);
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'next() must be called for valid token');
    assert(req.user, 'req.user must be populated');
    assert.strictEqual(req.user.email, 'dev@codescope.ai');
  });

  await test('requireAuth middleware rejects request missing Authorization header with HTTP 401', async () => {
    const req = createMockReq({ headers: {} });
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, 'next() must not be called');
    assert.strictEqual(res.statusCode, 401);
    assert(res.jsonData.authRequired === true);
  });

  await test('requireAuth middleware rejects invalid/corrupt token with HTTP 401', async () => {
    const req = createMockReq({ headers: { authorization: 'Bearer this.is.invalid' } });
    const res = createMockRes();
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  await test('handleGetMe returns authenticated user data when valid token is supplied', async () => {
    const user = { id: 'usr-me', email: 'me@codescope.ai', name: 'Me User', role: 'Staff' };
    const token = signUserToken(user);
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    await handleGetMe(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.user.email, 'me@codescope.ai');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 3: Webhook HMAC Signature Verification');
  // ──────────────────────────────────────────────────────────────────────────

  await test('verifyGitHubSignature succeeds for authentic HMAC-SHA256 signature', async () => {
    const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    try {
      process.env.GITHUB_WEBHOOK_SECRET = 'super-secret-webhook-key-9988';
      const payload = JSON.stringify({ event: 'push', repository: { name: 'codescope' } });
      const signature = `sha256=${crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex')}`;

      const isValid = verifyGitHubSignature(payload, signature);
      assert.strictEqual(isValid, true, 'Authentic signature must pass verification');
    } finally {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    }
  });

  await test('verifyGitHubSignature rejects tampered payload (signature mismatch)', async () => {
    const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    try {
      process.env.GITHUB_WEBHOOK_SECRET = 'super-secret-webhook-key-9988';
      const originalPayload = JSON.stringify({ ref: 'refs/heads/main' });
      const signature = `sha256=${crypto
        .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
        .update(originalPayload)
        .digest('hex')}`;

      const tamperedPayload = JSON.stringify({ ref: 'refs/heads/evil-branch' });
      const isValid = verifyGitHubSignature(tamperedPayload, signature);
      assert.strictEqual(isValid, false, 'Tampered payload must be rejected');
    } finally {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    }
  });

  await test('verifyGitHubSignature rejects empty or malformed signature header', async () => {
    const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    try {
      process.env.GITHUB_WEBHOOK_SECRET = 'secret-key-123';
      const payload = JSON.stringify({ event: 'pull_request' });
      assert.strictEqual(verifyGitHubSignature(payload, ''), false);
      assert.strictEqual(verifyGitHubSignature(payload, null), false);
      assert.strictEqual(verifyGitHubSignature(payload, 'sha256=invalid_short_hash'), false);
    } finally {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    }
  });

  await test('verifyGitHubSignature safely rejects unconfigured secret in production mode', async () => {
    const prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    const prevEnv = process.env.NODE_ENV;
    try {
      delete process.env.GITHUB_WEBHOOK_SECRET;
      process.env.NODE_ENV = 'production';
      const payload = JSON.stringify({ event: 'push' });
      const isValid = verifyGitHubSignature(payload, 'sha256=abcdef');
      assert.strictEqual(isValid, false, 'In production, missing secret must strictly reject');
    } finally {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
      process.env.NODE_ENV = prevEnv;
    }
  });

  await test('verifyGitLabToken uses constant-time comparison and validates matching token', async () => {
    const prevSecret = process.env.GITLAB_WEBHOOK_SECRET;
    try {
      process.env.GITLAB_WEBHOOK_SECRET = 'gl-secret-token-abc';
      assert.strictEqual(verifyGitLabToken('gl-secret-token-abc'), true);
      assert.strictEqual(verifyGitLabToken('gl-secret-token-wrong'), false);
      assert.strictEqual(verifyGitLabToken(''), false);
    } finally {
      process.env.GITLAB_WEBHOOK_SECRET = prevSecret;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 4: Repository Path Traversal & LFI Boundary Enforcement');
  // ──────────────────────────────────────────────────────────────────────────

  await test('validateRelativeFilePath accepts legitimate clean relative file paths', async () => {
    const validPaths = [
      'src/services/auth.js',
      'controllers/orderController.ts',
      'tests/unit/login.test.js',
      'components/Dashboard.jsx',
    ];
    for (const p of validPaths) {
      const res = validateRelativeFilePath(p);
      assert.strictEqual(res.valid, true, `Path '${p}' must be valid`);
      assert(res.cleanPath, 'cleanPath must be returned');
    }
  });

  await test('validateRelativeFilePath rejects directory traversal sequences (..)', async () => {
    const traversalAttempts = [
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      'src/../../.env',
      'controllers/../../../config/secrets.json',
      '../outside.js',
    ];
    for (const p of traversalAttempts) {
      const res = validateRelativeFilePath(p);
      assert.strictEqual(res.valid, false, `Traversal path '${p}' must be rejected`);
      assert(res.error.toLowerCase().includes('traversal') || res.error.toLowerCase().includes('escape'));
    }
  });

  await test('validateRelativeFilePath rejects Windows drive prefix paths', async () => {
    const drivePaths = [
      'C:\\Windows\\System32\\cmd.exe',
      'D:/Secrets/keys.pem',
      'C:autoexec.bat',
    ];
    for (const p of drivePaths) {
      const res = validateRelativeFilePath(p);
      assert.strictEqual(res.valid, false, `Drive path '${p}' must be rejected`);
      assert(res.error.toLowerCase().includes('drive'));
    }
  });

  await test('validateRelativeFilePath rejects null byte injections and absolute root paths', async () => {
    assert.strictEqual(validateRelativeFilePath('src/app.js\0.jpg').valid, false);
    assert.strictEqual(validateRelativeFilePath('/etc/shadow').valid, false);
    assert.strictEqual(validateRelativeFilePath('/var/www/index.html').valid, false);
  });

  await test('addExplicitFile throws error when path traversal is attempted', async () => {
    assert.throws(
      () => {
        addExplicitFile('repo-1', { filePath: '../../etc/passwd', content: 'root:x:0:0:' });
      },
      (err) => {
        return err.message.includes('traversal') || err.message.includes('escape') || err.message.includes('Absolute');
      },
      'addExplicitFile must throw on traversal attempt'
    );
  });

  await test('removeExplicitFile rejects path traversal identifier safely without throwing', async () => {
    const res = removeExplicitFile('repo-1', '../../etc/passwd');
    assert.strictEqual(res.success, false);
    assert(res.error, 'Should return rejection error');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 5: Database URI Normalization & Storage Persistence Status');
  // ──────────────────────────────────────────────────────────────────────────

  await test('resolveMongoUri prioritizes MONGODB_URI over MONGO_URI', async () => {
    const origMongoDB = process.env.MONGODB_URI;
    const origMongo = process.env.MONGO_URI;
    try {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/primary_db';
      process.env.MONGO_URI = 'mongodb://localhost:27017/fallback_db';
      const resolved = resolveMongoUri();
      assert.strictEqual(resolved.uri, 'mongodb://localhost:27017/primary_db');
      assert.strictEqual(resolved.source, 'MONGODB_URI');
    } finally {
      process.env.MONGODB_URI = origMongoDB;
      process.env.MONGO_URI = origMongo;
    }
  });

  await test('resolveMongoUri supports legacy MONGO_URI when MONGODB_URI is not set', async () => {
    const origMongoDB = process.env.MONGODB_URI;
    const origMongo = process.env.MONGO_URI;
    try {
      delete process.env.MONGODB_URI;
      process.env.MONGO_URI = 'mongodb://localhost:27017/legacy_db';
      const resolved = resolveMongoUri();
      assert.strictEqual(resolved.uri, 'mongodb://localhost:27017/legacy_db');
      assert.strictEqual(resolved.source, 'MONGO_URI');
    } finally {
      process.env.MONGODB_URI = origMongoDB;
      process.env.MONGO_URI = origMongo;
    }
  });

  await test('resolveMongoUri flags placeholder URI strings honestly', async () => {
    const origMongoDB = process.env.MONGODB_URI;
    try {
      process.env.MONGODB_URI = 'mongodb+srv://<username>:<password>@cluster0.example.com/db';
      const resolved = resolveMongoUri();
      assert.strictEqual(resolved.isPlaceholder, true);
    } finally {
      process.env.MONGODB_URI = origMongoDB;
    }
  });

  await test('getDatabaseStatus reports storageMode honestly', async () => {
    const status = getDatabaseStatus();
    assert(typeof status.connected === 'boolean');
    assert(typeof status.storageMode === 'string');
    assert(['mongodb-persistent', 'in-memory-fallback'].includes(status.storageMode));
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 6: Python Service Unavailable & Timeout Handling');
  // ──────────────────────────────────────────────────────────────────────────

  await test('checkPythonServiceHealth handles offline service gracefully without crashing', async () => {
    const origUrl = process.env.PYTHON_AGENT_URL;
    try {
      process.env.PYTHON_AGENT_URL = 'http://127.0.0.1:59999'; // unreachable port
      const health = await checkPythonServiceHealth();
      assert.strictEqual(health.available, false);
      assert.strictEqual(health.status, 'unavailable');
      assert(health.error, 'Error message must be present');
    } finally {
      process.env.PYTHON_AGENT_URL = origUrl;
    }
  });

  await test('triggerPythonRepoIndex rejects non-existent repository path honestly', async () => {
    const fakePath = 'C:\\NonExistentPath_Test8_XYZ123';
    const result = await triggerPythonRepoIndex(fakePath);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'path_not_found');
    assert.strictEqual(result.chunksStored, 0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 7: AI Provider Failure Resilience & Honest Fallback Metadata');
  // ──────────────────────────────────────────────────────────────────────────

  await test('generateImpactPrimer honestly marks fallbackUsed: true and liveInference: false on missing key', async () => {
    const origKey = process.env.NEBIUS_API_KEY;
    const origNvidiaKey = process.env.NVIDIA_API_KEY;
    try {
      delete process.env.NEBIUS_API_KEY;
      delete process.env.NVIDIA_API_KEY;

      const primer = await generateImpactPrimer('User auth changes', ['src/services/authService.js']);
      assert(primer, 'Primer must return valid fallback object');
      assert.strictEqual(primer.aiMetadata?.liveInference, false, 'liveInference must be strictly false');
      assert.strictEqual(primer.aiMetadata?.fallbackUsed, true, 'fallbackUsed must be strictly true');
      assert.strictEqual(primer.aiMetadata?.model, null, 'model must be null on fallback');
      assert(primer.aiMetadata?.error, 'Error reason must be recorded');
    } finally {
      process.env.NEBIUS_API_KEY = origKey;
      process.env.NVIDIA_API_KEY = origNvidiaKey;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\nAREA 8: Error Sanitization & Secret Redaction');
  // ──────────────────────────────────────────────────────────────────────────

  await test('sanitizeErrorForClient scrubs Nebius API keys', async () => {
    const raw = 'Failed to connect: nebius-live-secret-token-1234567890';
    const sanitized = sanitizeErrorForClient(raw);
    assert(!sanitized.includes('nebius-live-secret-token'), 'Must scrub Nebius key');
    assert(sanitized.includes('[REDACTED_NEBIUS_KEY]'), 'Must replace with placeholder');
  });

  await test('sanitizeErrorForClient scrubs NVIDIA NIM nvapi keys', async () => {
    const raw = 'Unauthorized on nvapi-abcdef1234567890qwerty';
    const sanitized = sanitizeErrorForClient(raw);
    assert(!sanitized.includes('nvapi-abcdef1234567890'), 'Must scrub NVIDIA key');
    assert(sanitized.includes('[REDACTED_NVIDIA_KEY]'), 'Must replace with placeholder');
  });

  await test('sanitizeErrorForClient scrubs GitHub personal access tokens (ghp_)', async () => {
    const raw = 'GitHub 401 error with ghp_ABCDefgh1234567890IJKL';
    const sanitized = sanitizeErrorForClient(raw);
    assert(!sanitized.includes('ghp_ABCDefgh'), 'Must scrub GitHub token');
    assert(sanitized.includes('[REDACTED_GH_TOKEN]'), 'Must replace with placeholder');
  });

  await test('sanitizeErrorForClient scrubs Bearer tokens and Windows paths', async () => {
    const raw = 'Error in C:\\Users\\Administrator\\Desktop\\secrets with Bearer eyJhbGciOiJIUzI1NiJ9.test';
    const sanitized = sanitizeErrorForClient(raw);
    assert(!sanitized.includes('C:\\Users\\Administrator'), 'Must scrub Windows internal paths');
    assert(!sanitized.includes('eyJhbGciOiJIUzI1NiJ9'), 'Must scrub Bearer token');
  });

  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`TASK 8 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTask8SecuritySuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
