import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { sendEmailNotification } from '../services/notificationService.js';
import { signUserToken, verifyUserToken } from '../middleware/authMiddleware.js';

// OTP storage for registration email verification: email -> { otp, expiresAt, name }
const registrationOTPs = new Map();

/**
 * Hash a plaintext password with bcrypt using 10 salt rounds.
 * @param {string} plain
 * @returns {Promise<string>}
 */
export const hashPassword = async (plain) => {
  if (!plain || typeof plain !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plain, 10);
};

/**
 * Verify a plaintext password against a stored bcrypt hash or legacy plaintext.
 * Safely handles legacy plaintext values using constant-time comparison during transition.
 * 
 * @param {string} plainPassword
 * @param {string} storedHashOrPlain
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (plainPassword, storedHashOrPlain) => {
  if (!plainPassword || !storedHashOrPlain) return false;

  // Standard bcrypt hash format starts with $2a$ or $2b$
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$')) {
    return bcrypt.compare(plainPassword, storedHashOrPlain);
  }

  // Legacy transition handling with constant-time equality check
  try {
    const bufA = Buffer.from(plainPassword);
    const bufB = Buffer.from(storedHashOrPlain);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

// Pre-hashed default password for in-memory developer accounts
const DEFAULT_HASH = bcrypt.hashSync('password123', 10);

// In-Memory User Registry Fallback (passwords stored as cryptographic bcrypt hashes)
const inMemoryUsers = [
  {
    id: 'usr-1',
    name: 'Abhiram Sadgun',
    email: 'abhiram@codescope.ai',
    password: DEFAULT_HASH,
    role: 'Senior Staff Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    githubUsername: 'abhiramsadgun94',
    jiraUsername: 'abhiram@codescope.ai',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-2',
    name: 'Alex Rivera',
    email: 'developer@codescope.ai',
    password: DEFAULT_HASH,
    role: 'Full Stack Developer',
    avatar: '',
    githubUsername: 'alexrivera',
    jiraUsername: 'alex@codescope.ai',
    createdAt: new Date().toISOString(),
  },
];

let currentUser = inMemoryUsers[0];

/**
 * POST /api/auth/send-registration-otp
 * Validates email uniqueness and dispatches a 6-digit verification OTP.
 */
export const handleSendRegistrationOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if account already exists
    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingInMemory) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    if (mongoose.connection?.readyState === 1) {
      try {
        const existingInDb = await User.findOne({ email: normalizedEmail });
        if (existingInDb) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
      } catch {
        // DB check fallback
      }
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes TTL

    registrationOTPs.set(normalizedEmail, {
      otp,
      expiresAt,
      name: name || 'Developer',
    });

    console.log(`\n========================================`);
    console.log(`🔑 [CodeScope Registration OTP]`);
    console.log(`📧 Recipient: ${normalizedEmail}`);
    console.log(`🔢 Code:      ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`========================================\n`);

    // Dispatch branded HTML email via SMTP / Nodemailer
    const emailSubject = `CodeScope - Your Verification Code: ${otp}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; color: #FFFFFF;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); width: 38px; height: 38px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: #FFF; text-align: center; line-height: 38px;">
            CS
          </div>
          <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-left: 10px;">Code<span style="color: #818CF8;">Scope</span></span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #FFFFFF;">Verify Your Email Address</h2>
        <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Hi ${name || 'Developer'}, welcome to CodeScope! Enter the 6-digit verification code below to confirm your email and activate your workspace.
        </p>
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818CF8; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 10 minutes. If you did not request this account, you can safely ignore this email.
        </p>
      </div>
    `;

    // Attempt sending email asynchronously
    sendEmailNotification(normalizedEmail, emailSubject, emailHtml).catch((err) => {
      console.warn('[Auth OTP Email Warning]:', err.message);
    });

    return res.status(200).json({
      message: 'Verification code sent to ' + normalizedEmail,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Send Registration OTP Error:', error);
    return res.status(500).json({ error: 'Failed to dispatch registration OTP.' });
  }
};

/**
 * POST /api/auth/verify-and-register
 * Verifies submitted 6-digit OTP, securely hashes password, and finalizes account creation.
 */
export const handleVerifyAndRegister = async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    if (!name || !email || !password || !otp) {
      return res.status(400).json({ error: 'Name, email, password, and verification OTP are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const storedData = registrationOTPs.get(normalizedEmail);

    if (!storedData) {
      return res.status(400).json({ error: 'No pending OTP verification found for this email. Please request a new code.' });
    }

    if (Date.now() > storedData.expiresAt) {
      registrationOTPs.delete(normalizedEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (storedData.otp !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the code and try again.' });
    }

    // OTP Verified! Clear pending record
    registrationOTPs.delete(normalizedEmail);

    // Securely hash password
    const hashedPassword = await hashPassword(password);

    // Create User
    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'Software Engineer',
      avatar: '',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    currentUser = newUser;

    // Persist to MongoDB if connected
    if (mongoose.connection?.readyState === 1) {
      try {
        const dbDoc = await User.create({
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
          role: newUser.role,
        });
        if (dbDoc && dbDoc._id) {
          newUser.id = dbDoc._id.toString();
        }
      } catch {
        // In-memory fallback
      }
    }

    const token = signUserToken(newUser);

    return res.status(201).json({
      message: 'Email verified and account registered successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
      token,
    });
  } catch (error) {
    console.error('Verify & Register Error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP and complete registration.' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Dispatches a 6-digit password recovery OTP.
 */
export const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    registrationOTPs.set(`reset_${normalizedEmail}`, {
      otp,
      expiresAt,
    });

    console.log(`\n========================================`);
    console.log(`🔒 [CodeScope Password Reset OTP]`);
    console.log(`📧 Recipient: ${normalizedEmail}`);
    console.log(`🔢 Code:      ${otp}`);
    console.log(`⏰ Valid for: 10 minutes`);
    console.log(`========================================\n`);

    const emailSubject = `CodeScope - Password Reset Code: ${otp}`;
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0F172A; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 32px; color: #FFFFFF;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); width: 38px; height: 38px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: #FFF; text-align: center; line-height: 38px;">
            CS
          </div>
          <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-left: 10px;">Code<span style="color: #818CF8;">Scope</span></span>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 12px 0; color: #FFFFFF;">Password Recovery</h2>
        <p style="color: #94A3B8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          We received a request to reset your password. Use the 6-digit recovery code below:
        </p>
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #818CF8; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin: 0;">
          This code expires in 10 minutes. If you did not request a password reset, please ignore this email.
        </p>
      </div>
    `;

    sendEmailNotification(normalizedEmail, emailSubject, emailHtml).catch((err) => {
      console.warn('[Forgot Password Email Warning]:', err.message);
    });

    return res.status(200).json({
      message: 'Password reset code sent to ' + normalizedEmail,
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

/**
 * POST /api/auth/reset-password
 * Verifies recovery OTP and updates password using bcrypt hash.
 */
export const handleResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const stored = registrationOTPs.get(`reset_${normalizedEmail}`);

    if (!stored) {
      return res.status(400).json({ error: 'No active password reset request found. Please request a new code.' });
    }

    if (Date.now() > stored.expiresAt) {
      registrationOTPs.delete(`reset_${normalizedEmail}`);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new code.' });
    }

    if (stored.otp !== String(otp).trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // OTP Verified
    registrationOTPs.delete(`reset_${normalizedEmail}`);

    // Securely hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update in MongoDB
    if (mongoose.connection?.readyState === 1) {
      try {
        const updated = await User.findOneAndUpdate(
          { email: normalizedEmail },
          { $set: { password: hashedPassword } },
          { new: true, upsert: true }
        );
        if (updated && !inMemoryUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          inMemoryUsers.push({
            id: updated._id.toString(),
            name: updated.name || 'Developer',
            email: normalizedEmail,
            password: hashedPassword,
            role: updated.role || 'Senior Developer',
            avatar: '',
          });
        }
      } catch {
        // fallback
      }
    }

    // Update in-memory user
    const memUser = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (memUser) {
      memUser.password = hashedPassword;
    } else {
      inMemoryUsers.push({
        id: `usr-${Date.now()}`,
        name: 'Developer',
        email: normalizedEmail,
        password: hashedPassword,
        role: 'Senior Developer',
        avatar: '',
      });
    }

    return res.status(200).json({ message: 'Password has been successfully updated.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
};

/**
 * POST /api/auth/register
 * Direct registration endpoint with bcrypt password hashing.
 */
export const handleRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingInMemory = inMemoryUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingInMemory) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || 'Software Engineer',
      avatar: '',
      createdAt: new Date().toISOString(),
    };

    inMemoryUsers.push(newUser);
    currentUser = newUser;

    // Try saving to DB if connected
    if (mongoose.connection?.readyState === 1) {
      try {
        const dbDoc = await User.create({
          name: newUser.name,
          email: newUser.email,
          password: hashedPassword,
          role: newUser.role,
        });
        if (dbDoc && dbDoc._id) {
          newUser.id = dbDoc._id.toString();
        }
      } catch {
        // Fall back safely to in-memory user
      }
    }

    const token = signUserToken(newUser);

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
      },
      token,
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: 'Failed to register account.' });
  }
};

/**
 * POST /api/auth/login
 * Authenticates user, verifies password via bcrypt, auto-upgrades legacy passwords,
 * and issues a signed cryptographic JWT.
 */
export const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Try finding in MongoDB first
    let matchedUser = null;
    let needsUpgrade = false;
    let dbUserDoc = null;

    if (mongoose.connection?.readyState === 1) {
      try {
        const dbUser = await User.findOne({ email: normalizedEmail });
        if (dbUser) {
          const isMatch = await verifyPassword(password, dbUser.password);
          if (isMatch) {
            matchedUser = {
              id: dbUser._id.toString(),
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role || 'Senior Developer',
              avatar: dbUser.avatar || '',
              githubUsername: dbUser.githubUsername || '',
              jiraUsername: dbUser.jiraUsername || '',
            };
            if (!dbUser.password.startsWith('$2a$') && !dbUser.password.startsWith('$2b$')) {
              needsUpgrade = true;
              dbUserDoc = dbUser;
            }
          }
        }
      } catch (dbErr) {
        console.warn('[Auth Login] DB lookup warning:', dbErr.message);
      }
    }

    // 2. Try in-memory fallback
    if (!matchedUser) {
      for (const u of inMemoryUsers) {
        if (u.email.toLowerCase() === normalizedEmail) {
          const isMatch = await verifyPassword(password, u.password);
          if (isMatch) {
            matchedUser = u;
            // Upgrade legacy in-memory password if needed
            if (!u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
              u.password = await hashPassword(password);
            }
            break;
          }
        }
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Auto-upgrade legacy plaintext in MongoDB to bcrypt hash
    if (needsUpgrade && dbUserDoc) {
      try {
        const upgradedHash = await hashPassword(password);
        await User.updateOne({ _id: dbUserDoc._id }, { $set: { password: upgradedHash } });
        console.log(`[Auth Security] ✅ Auto-upgraded legacy password to bcrypt for ${normalizedEmail}`);
      } catch (upgradeErr) {
        console.warn('[Auth Security] Upgrade warning:', upgradeErr.message);
      }
    }

    currentUser = matchedUser;
    const token = signUserToken(matchedUser);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: matchedUser.id || matchedUser._id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
        avatar: matchedUser.avatar || '',
        githubUsername: matchedUser.githubUsername || '',
        jiraUsername: matchedUser.jiraUsername || '',
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Failed to authenticate user.' });
  }
};

/**
 * GET /api/auth/me or GET /api/me
 * Returns the currently authenticated user based on JWT verification.
 */
export const handleGetMe = async (req, res) => {
  // 1. If user was attached by requireAuth or optionalAuth middleware
  if (req.user) {
    return res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar || '',
        githubUsername: req.user.githubUsername || '',
        jiraUsername: req.user.jiraUsername || '',
      },
    });
  }

  // 2. Direct token verification from Authorization header
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  if (authHeader) {
    const verified = verifyUserToken(authHeader);
    if (verified.valid && verified.payload) {
      return res.status(200).json({
        user: {
          id: verified.payload.id,
          name: verified.payload.name,
          email: verified.payload.email,
          role: verified.payload.role,
          avatar: verified.payload.avatar || '',
          githubUsername: verified.payload.githubUsername || '',
          jiraUsername: verified.payload.jiraUsername || '',
        },
      });
    }
  }

  // 3. Fallback to active developer session in non-production environments
  if (process.env.NODE_ENV !== 'production' && currentUser) {
    return res.status(200).json({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatar: currentUser.avatar,
        githubUsername: currentUser.githubUsername || '',
        jiraUsername: currentUser.jiraUsername || '',
      },
    });
  }

  return res.status(401).json({
    error: 'Authentication required. Authorization header missing or invalid.',
    authRequired: true,
  });
};

/**
 * PATCH /api/me/integrations
 * Saves the user's GitHub and Jira usernames.
 */
export const handleUpdateIntegrations = async (req, res) => {
  try {
    const { githubUsername, jiraUsername } = req.body;
    const targetEmail = req.user?.email || currentUser?.email;

    if (!targetEmail) {
      return res.status(401).json({ error: 'Authentication required to update integrations.' });
    }

    const cleanGithub = (githubUsername || '').trim();
    const cleanJira = (jiraUsername || '').trim();

    // Update in-memory user
    const memIdx = inMemoryUsers.findIndex((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (memIdx >= 0) {
      inMemoryUsers[memIdx].githubUsername = cleanGithub;
      inMemoryUsers[memIdx].jiraUsername = cleanJira;
    }

    if (currentUser && currentUser.email.toLowerCase() === targetEmail.toLowerCase()) {
      currentUser.githubUsername = cleanGithub;
      currentUser.jiraUsername = cleanJira;
    }

    // Persist to MongoDB if available
    try {
      await User.updateOne(
        { email: targetEmail },
        { $set: { githubUsername: cleanGithub, jiraUsername: cleanJira } }
      );
    } catch {
      // MongoDB may not be connected
    }

    console.log(`[Auth] Updated integrations for ${targetEmail}: GitHub=@${cleanGithub}, Jira=${cleanJira}`);

    return res.status(200).json({
      message: 'Integration usernames updated successfully',
      user: {
        email: targetEmail,
        githubUsername: cleanGithub,
        jiraUsername: cleanJira,
      },
    });
  } catch (error) {
    console.error('Update Integrations Error:', error);
    return res.status(500).json({ error: 'Failed to update integration settings.' });
  }
};

export const getCurrentUser = () => currentUser;

export const findUserByGithubUsername = (username) => {
  if (!username) return null;
  const clean = String(username).replace(/^@/, '').toLowerCase().trim();
  return (
    inMemoryUsers.find(
      (u) => (u.githubUsername || '').replace(/^@/, '').toLowerCase() === clean
    ) || null
  );
};
