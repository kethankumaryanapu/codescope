import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchRepositories,
  scanRepository,
  fetchDashboardStats,
  fetchHistory,
  analyzeImpact,
  preReviewCode,
  fetchRepoFiles,
  addExplicitFile,
  batchAddExplicitFiles,
  deleteExplicitFile,
  clearAllRepoFiles,
} from '../services/api';

const AnalysisContext = createContext();

const DEFAULT_BRD = `Requirement: Multi-Factor Authentication & Discount Rate Limit
1. Implement 2FA TOTP verification on checkout for high-value orders (> $500).
2. Validate discount percentage in discountService: Max 40% threshold for non-admin accounts.
3. Update Order model to record 'requires2FA' boolean flag.
4. Add comprehensive unit tests in checkout.test.js for edge cases.`;

const DEFAULT_GIT_DIFF = `diff --git a/src/controllers/checkoutController.js b/src/controllers/checkoutController.js
index 83a1b2c..94d2e3f 100644
--- a/src/controllers/checkoutController.js
+++ b/src/controllers/checkoutController.js
@@ -15,6 +15,10 @@ export const processCheckout = async (req, res) => {
   const { cart, user, discountCode, totpToken } = req.body;
+  if (cart.total > 500 && !totpToken) {
+    return res.status(403).json({ error: "2FA Verification Required for high value orders" });
+  }
   const discount = await applyDiscount(discountCode, user);
   const order = await Order.create({ user: user.id, total: cart.total - discount, requires2FA: cart.total > 500 });
   return res.status(200).json({ success: true, order });
 };`;

const INITIAL_REPOSITORIES = [
  { id: 'repo-1', name: 'codescope-backend', branch: 'main', status: 'Connected', filesCount: 12, coverage: '91%' },
  { id: 'repo-2', name: 'codescope-frontend', branch: 'main', status: 'Connected', filesCount: 18, coverage: '88%' },
  { id: 'repo-3', name: 'payment-gateway', branch: 'feat/stripe-v2', status: 'Connected', filesCount: 19, coverage: '94%' },
];

const INITIAL_HISTORY = [
  {
    id: 'HIST-1',
    requirementId: 'JIRA-241',
    title: 'Multi-Factor Authentication on High-Value Orders',
    status: 'Completed',
    confidence: '97%',
    impactedFiles: 4,
    timestamp: '10 mins ago',
  },
  {
    id: 'HIST-2',
    requirementId: 'JIRA-182',
    title: 'OAuth2 & JWT Token Refresh Pipeline',
    status: 'Completed',
    confidence: '94%',
    impactedFiles: 3,
    timestamp: '2 hours ago',
  },
  {
    id: 'HIST-3',
    requirementId: 'JIRA-305',
    title: 'Stripe Webhook Signature Verification & Idempotency',
    status: 'Completed',
    confidence: '92%',
    impactedFiles: 2,
    timestamp: '1 day ago',
  },
];

export const AnalysisProvider = ({ children }) => {
  const [repositories, setRepositories] = useState(INITIAL_REPOSITORIES);
  const [selectedRepo, setSelectedRepo] = useState(INITIAL_REPOSITORIES[0]);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  // Tracked Codebase Files
  const [repoFiles, setRepoFiles] = useState([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const [requirementId, setRequirementId] = useState('JIRA-241');
  const [brdText, setBrdText] = useState(DEFAULT_BRD);
  const [gitDiff, setGitDiff] = useState(DEFAULT_GIT_DIFF);

  // Structured Analysis Data from Gemini AI
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Structured Review Data from Gemini AI
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  // Dynamic Agent Workflow Stages & Execution Telemetry
  const [executionId, setExecutionId] = useState(null);
  const [stageDetails, setStageDetails] = useState(null);
  const [workflow, setWorkflow] = useState({
    coordinator: 'Ready',
    requirement: 'Ready',
    impact: 'Ready',
    review: 'Waiting',
    pr: 'Waiting',
    progress: 0,
  });

  const loadRepoFiles = useCallback(async (repoId = selectedRepo?.id || 'repo-1') => {
    setIsLoadingFiles(true);
    try {
      const data = await fetchRepoFiles(repoId);
      if (data && data.files) {
        setRepoFiles(data.files);
      }
    } catch (err) {
      console.warn('Error loading files:', err.message);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [selectedRepo?.id]);

  // Hydrate initial data from backend and keep it fresh
  useEffect(() => {
    const loadBackendData = async () => {
      setIsLiveSyncing(true);
      try {
        const [reposData, statsData, histData] = await Promise.allSettled([
          fetchRepositories(),
          fetchDashboardStats(),
          fetchHistory(),
        ]);

        if (reposData.status === 'fulfilled' && reposData.value?.repositories) {
          setRepositories(reposData.value.repositories);
          setSelectedRepo((prev) => prev || reposData.value.repositories[0]);
        }
        if (statsData.status === 'fulfilled') {
          setDashboardStats(statsData.value);
        }
        if (histData.status === 'fulfilled' && histData.value?.history) {
          setHistory(histData.value.history);
        }
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn('Backend sync note:', err.message);
      } finally {
        setIsLiveSyncing(false);
      }
    };

    loadBackendData();
    loadRepoFiles(selectedRepo?.id || 'repo-1');
    const interval = window.setInterval(() => loadBackendData(), 15000);
    return () => window.clearInterval(interval);
  }, [selectedRepo?.id, loadRepoFiles]);

  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
    loadRepoFiles(repo.id);
  };

  const addCustomFile = async ({ filePath, content, module }) => {
    const repoId = selectedRepo?.id || 'repo-1';
    const normalizedPath = (filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

    const optimisticFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      filePath: normalizedPath,
      rootPath: normalizedPath,
      content: content || '',
      lineCount: (content ? content.split('\n').length : 1),
      sizeBytes: (content ? content.length : 0),
      module: module || 'Controllers',
      functions: [],
      isExplicit: true,
      addedAt: new Date().toISOString(),
    };

    // Optimistic update
    setRepoFiles((prev) => [optimisticFile, ...prev.filter((f) => f.filePath !== normalizedPath)]);

    try {
      const result = await addExplicitFile({ repoId, filePath: normalizedPath, content, module });
      await loadRepoFiles(repoId);
      return result;
    } catch (err) {
      console.warn('Backend sync failed, file saved in active state:', err.message);
      return optimisticFile;
    }
  };

  const batchAddCustomFiles = async (filesList) => {
    const repoId = selectedRepo?.id || 'repo-1';
    const newlyParsed = filesList.map((item) => {
      const p = (item.filePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        filePath: p,
        rootPath: p,
        content: item.content || '',
        lineCount: item.content ? item.content.split('\n').length : 1,
        sizeBytes: item.content ? item.content.length : 0,
        module: item.module || 'Services',
        functions: [],
        isExplicit: true,
        addedAt: new Date().toISOString(),
      };
    });

    // Optimistic update
    setRepoFiles((prev) => {
      const newPaths = new Set(newlyParsed.map((f) => f.filePath));
      return [...newlyParsed, ...prev.filter((f) => !newPaths.has(f.filePath))];
    });

    try {
      const result = await batchAddExplicitFiles(repoId, filesList);
      await loadRepoFiles(repoId);
      return result;
    } catch (err) {
      console.warn('Backend batch sync note:', err.message);
      return newlyParsed;
    }
  };

  const removeCustomFile = async (fileIdentifier) => {
    const repoId = selectedRepo?.id || 'repo-1';
    const normalized = (fileIdentifier || '').toString().replace(/\\/g, '/').replace(/^\/+/, '');

    // Optimistic update
    setRepoFiles((prev) => prev.filter((f) => f.id !== normalized && f.filePath !== normalized && f.filePath !== fileIdentifier));

    try {
      const result = await deleteExplicitFile(fileIdentifier, repoId);
      await loadRepoFiles(repoId);
      return result;
    } catch (err) {
      console.warn('Backend delete sync note:', err.message);
      return { success: true };
    }
  };

  const clearAllFiles = async () => {
    const repoId = selectedRepo?.id || 'repo-1';
    setRepoFiles([]);
    try {
      const result = await clearAllRepoFiles(repoId);
      return result;
    } catch (err) {
      console.warn('Backend clear all sync note:', err.message);
      return { success: true };
    }
  };

  const runRepoScan = async (repoId = selectedRepo?.id) => {
    try {
      const data = await scanRepository(repoId);
      if (data.repo) {
        setRepositories((prev) => prev.map((r) => (r.id === data.repo.id ? data.repo : r)));
        setSelectedRepo(data.repo);
      }
      await loadRepoFiles(repoId);
      return data;
    } catch (err) {
      console.error('Scan error:', err);
      throw err;
    }
  };

  const runImpactAnalysis = async (text = brdText, repoId = selectedRepo?.id, reqId = requirementId, diff = gitDiff) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    setWorkflow({
      coordinator: 'Running',
      requirement: 'Running',
      impact: 'Running',
      review: diff ? 'Waiting' : 'Waiting',
      pr: 'Waiting',
      progress: 20,
    });

    try {
      const data = await analyzeImpact(text, repoId, reqId, repoFiles, diff);
      setAnalysisData(data);
      setAnalysisResult(data.summaryMarkdown || data.primer);

      if (data.executionId) {
        setExecutionId(data.executionId);
      }
      if (data.stages) {
        setStageDetails(data.stages);
      }
      if (data.workflow) {
        setWorkflow(data.workflow);
      } else {
        setWorkflow({
          coordinator: 'Completed',
          requirement: 'Completed',
          impact: 'Completed',
          review: diff ? 'Ready' : 'Skipped',
          pr: 'Waiting',
          progress: 60,
        });
      }

      if (data.reviewMarkdown) {
        setReviewData(data);
        setReviewResult(data.reviewMarkdown);
      }

      // Update history
      const newEntry = {
        id: `HIST-${Date.now()}`,
        requirementId: reqId,
        title: text.split('\n')[0].replace(/^Requirement:\s*/, '') || reqId,
        status: data.status === 'Failed' ? 'Failed' : 'Completed',
        confidence: data.stats?.confidence || '98%',
        impactedFiles: data.impactedFiles?.length || 4,
        timestamp: 'Just now',
      };

      setHistory((prev) => [newEntry, ...prev.filter((item) => item.requirementId !== reqId)]);

      return data;
    } catch (err) {
      console.error('Impact Analysis Error:', err);
      setAnalysisError(err.message || 'Failed to analyze requirement.');
      setWorkflow((prev) => ({
        ...prev,
        impact: 'Failed',
        progress: 30,
      }));
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runCodeReview = async (diff = gitDiff, reqId = requirementId, repoId = selectedRepo?.id) => {
    setIsReviewing(true);
    setReviewError(null);

    setWorkflow((prev) => ({
      ...prev,
      review: 'Running',
      progress: Math.max(prev.progress || 0, 70),
    }));

    try {
      const data = await preReviewCode(diff, reqId, repoId);
      setReviewData(data);
      setReviewResult(data.reviewMarkdown || data.reviewResult);

      if (data.workflow) {
        setWorkflow(data.workflow);
      } else {
        setWorkflow((prev) => ({
          ...prev,
          review: 'Completed',
          pr: 'Ready',
          progress: 90,
        }));
      }

      return data;
    } catch (err) {
      console.error('Code Review Error:', err);
      setReviewError(err.message || 'Failed to review code.');
      setWorkflow((prev) => ({
        ...prev,
        review: 'Failed',
        progress: 60,
      }));
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };

  const runFullPipeline = async (options = {}) => {
    const text = options.text || brdText;
    const repo = options.repoId || selectedRepo?.id;
    const req = options.reqId || requirementId;
    const diff = options.diff !== undefined ? options.diff : gitDiff;
    return runImpactAnalysis(text, repo, req, diff);
  };

  return (
    <AnalysisContext.Provider
      value={{
        repositories,
        selectedRepo,
        setSelectedRepo: handleSelectRepo,
        history,
        dashboardStats,
        requirementId,
        setRequirementId,
        brdText,
        setBrdText,
        gitDiff,
        setGitDiff,
        repoFiles,
        isLoadingFiles,
        loadRepoFiles,
        addCustomFile,
        batchAddCustomFiles,
        removeCustomFile,
        clearAllFiles,
        isAnalyzing,
        analysisResult,
        analysisData,
        analysisError,
        isReviewing,
        reviewResult,
        reviewData,
        reviewError,
        workflow,
        executionId,
        stageDetails,
        lastUpdated,
        isLiveSyncing,
        runRepoScan,
        runImpactAnalysis,
        runCodeReview,
        runFullPipeline,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
