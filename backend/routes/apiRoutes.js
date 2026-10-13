import express from 'express';
import {
  handleImpactAnalysis,
  handlePreReview,
  handleOrchestrate,
  handleGetExecutionStatus,
} from '../controllers/agentController.js';
import {
  handleGetRepositories,
  handleScanRepository,
  handleGetDashboardStats,
  handleGetHistory,
  handleGetRepoFiles,
  handleAddExplicitFile,
  handleBatchAddExplicitFiles,
  handleDeleteExplicitFile,
  handleClearAllRepoFiles,
} from '../controllers/repoController.js';
import {
  handleRegister,
  handleSendRegistrationOTP,
  handleVerifyAndRegister,
  handleForgotPassword,
  handleResetPassword,
  handleLogin,
  handleGetMe,
  handleUpdateIntegrations,
} from '../controllers/authController.js';
import {
  handleListGitHubRepos,
  handleAutoSetupWebhook,
  handleAutoSyncAllWebhooks,
  handleGetWebhookStatus,
} from '../controllers/githubController.js';
import { handleSimulateWebhook } from '../controllers/webhookController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { getDatabaseStatus } from '../config/db.js';
import { checkPythonServiceHealth } from '../services/pythonAgentService.js';

const router = express.Router();

// ── System Health & Storage Mode Status ──────────────────────────────────────
router.get('/health', async (req, res) => {
  const dbStatus = getDatabaseStatus();
  const pyStatus = await checkPythonServiceHealth();
  const activeProvider = process.env.AI_PROVIDER || (process.env.NEBIUS_API_KEY ? 'nebius' : process.env.NVIDIA_API_KEY ? 'nvidia' : 'none');
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      storageMode: dbStatus.storageMode,
      uriSource: dbStatus.uriSource,
      isPlaceholder: dbStatus.isPlaceholder,
    },
    pythonAgent: {
      available: pyStatus.available,
      status: pyStatus.status,
    },
    aiProvider: {
      configured: activeProvider,
      nebiusConfigured: Boolean(process.env.NEBIUS_API_KEY && !process.env.NEBIUS_API_KEY.includes('your_')),
      nvidiaConfigured: Boolean(process.env.NVIDIA_API_KEY && !process.env.NVIDIA_API_KEY.includes('your_')),
    },
  });
});

// ── Public Authentication Routes ─────────────────────────────────────────────
router.post('/auth/send-registration-otp', handleSendRegistrationOTP);
router.post('/auth/verify-and-register', handleVerifyAndRegister);
router.post('/auth/forgot-password', handleForgotPassword);
router.post('/auth/reset-password', handleResetPassword);
router.post('/auth/register', handleRegister);
router.post('/auth/login', handleLogin);

// ── Protected Current User Routes (Requires Valid JWT) ────────────────────────
router.get('/auth/me', requireAuth, handleGetMe);
router.get('/me', requireAuth, handleGetMe);
router.patch('/me/integrations', requireAuth, handleUpdateIntegrations);

// ── Repository & Code Indexing Routes ─────────────────────────────────────────
router.get('/repositories', optionalAuth, handleGetRepositories);
router.post('/repositories/scan', optionalAuth, handleScanRepository);
router.get('/dashboard/stats', optionalAuth, handleGetDashboardStats);
router.get('/history', optionalAuth, handleGetHistory);

// ── GitHub 1-Click Integration & Management ───────────────────────────────────
router.get('/github/repos', optionalAuth, handleListGitHubRepos);
router.post('/github/auto-setup-webhook', requireAuth, handleAutoSetupWebhook);
router.post('/github/sync-all-webhooks', requireAuth, handleAutoSyncAllWebhooks);
router.get('/github/webhook-status', optionalAuth, handleGetWebhookStatus);

// ── Webhook Simulation & Testing API ──────────────────────────────────────────
router.post('/webhooks/simulate', handleSimulateWebhook);
router.post('/webhooks/test', handleSimulateWebhook);

// ── Explicit Code Files Management (Protected Write Endpoints) ───────────────
router.get('/repositories/files', optionalAuth, handleGetRepoFiles);
router.post('/repositories/files', requireAuth, handleAddExplicitFile);
router.post('/repositories/files/batch', requireAuth, handleBatchAddExplicitFiles);
router.post('/repositories/files/clear-all', requireAuth, handleClearAllRepoFiles);
router.post('/repositories/files/clear', requireAuth, handleClearAllRepoFiles);
router.delete('/repositories/files/all', requireAuth, handleClearAllRepoFiles);
router.post('/repositories/files/delete', requireAuth, handleDeleteExplicitFile);
router.delete('/repositories/files/:fileId', requireAuth, handleDeleteExplicitFile);
router.delete('/repositories/files', requireAuth, handleDeleteExplicitFile);

// ── AI Agent Core Routes & Aliases (Enriched with Optional Auth Context) ───────
router.post('/impact-analysis', optionalAuth, handleImpactAnalysis);
router.post('/impact', optionalAuth, handleImpactAnalysis);
router.post('/analyze', optionalAuth, handleImpactAnalysis);
router.post('/analyze-impact', optionalAuth, handleImpactAnalysis);

router.post('/pre-review', optionalAuth, handlePreReview);
router.post('/code-review', optionalAuth, handlePreReview);
router.post('/review', optionalAuth, handlePreReview);

// ── Multi-Agent Orchestration Pipeline Routes ─────────────────────────────────
router.post('/orchestrate', optionalAuth, handleOrchestrate);
router.post('/workflow/run', optionalAuth, handleOrchestrate);
router.post('/pipeline/run', optionalAuth, handleOrchestrate);
router.get('/orchestrate/status/:executionId', optionalAuth, handleGetExecutionStatus);
router.get('/workflow/status/:executionId', optionalAuth, handleGetExecutionStatus);
router.get('/pipeline/status/:executionId', optionalAuth, handleGetExecutionStatus);

// ── 404 handler for API routes ────────────────────────────────────────────────
router.use((req, res) => {
  res.status(404).json({
    error: `API route '${req.method} ${req.originalUrl}' not found. Available endpoints: POST /api/impact-analysis, POST /api/orchestrate, POST /api/pre-review, GET /api/repositories/files, GET /api/github/repos`,
  });
});

export default router;