/**
 * authMiddleware.js
 *
 * JWT Authentication & Authorization Middleware for CodeScope.
 * Enforces verified cryptographic tokens on protected endpoints while
 * preserving caller contracts and developer workflows.
 */

import jwt from 'jsonwebtoken';
import { getCurrentUser } from '../controllers/authController.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
    }
    return 'codescope-dev-jwt-secret-do-not-use-in-production-2026';
  }
  return secret;
};

/**
 * Generates a signed cryptographic JWT for an authenticated user.
 * 
 * @param {object} user - User payload ({ id, email, name, role, ... })
 * @param {string} [expiresIn='24h']
 * @returns {string} Signed JWT token
 */
export const signUserToken = (user, expiresIn = '24h') => {
  if (!user || (!user.id && !user._id) || !user.email) {
    throw new Error('Cannot sign token for invalid user object');
  }

  const payload = {
    id: String(user.id || user._id),
    email: user.email.toLowerCase().trim(),
    name: user.name || 'Developer',
    role: user.role || 'Senior Developer',
    githubUsername: user.githubUsername || '',
    jiraUsername: user.jiraUsername || '',
  };

  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

/**
 * Cryptographically verifies a JWT token.
 * 
 * @param {string} token
 * @returns {{ valid: boolean, payload?: object, error?: string }}
 */
export const verifyUserToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is missing or malformed' };
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  // Backward-compatibility bridge for existing tests in non-production environments
  if (cleanToken.startsWith('jwt-mock-')) {
    if (process.env.ALLOW_LEGACY_MOCK_TOKENS === 'true' || process.env.NODE_ENV === 'test') {
      const mockId = cleanToken.replace('jwt-mock-', '');
      const current = getCurrentUser();
      return {
        valid: true,
        payload: {
          id: mockId || current?.id || 'usr-1',
          email: current?.email || 'developer@codescope.ai',
          name: current?.name || 'Developer',
          role: current?.role || 'Senior Developer',
          isLegacyMock: true,
        },
      };
    }
    return { valid: false, error: 'Mock tokens are not permitted. Please log in with valid credentials.' };
  }

  try {
    const decoded = jwt.verify(cleanToken, getJwtSecret());
    return { valid: true, payload: decoded };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'Authentication token has expired. Please log in again.' };
    }
    return { valid: false, error: 'Invalid authentication token.' };
  }
};

/**
 * Strict authentication middleware.
 * Rejects requests with 401 Unauthorized if token is missing or invalid.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Authentication required. Authorization header missing.',
      authRequired: true,
    });
  }

  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  const result = verifyUserToken(token);

  if (!result.valid) {
    return res.status(401).json({
      error: result.error || 'Unauthorized',
      authRequired: true,
    });
  }

  req.user = result.payload;
  next();
};

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid token is provided, but does not block unauthenticated requests.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  if (authHeader) {
    const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    const result = verifyUserToken(token);
    if (result.valid) {
      req.user = result.payload;
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};
