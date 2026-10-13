import {
  getRepositories,
  getRepositoryById,
  indexRepository,
  getAllIndexedFilesWithDetails,
  addExplicitFile,
  batchAddExplicitFiles,
  removeExplicitFile,
  clearAllRepoFiles,
  resolveValidatedRepoPath,
  updateRepoPythonIndexStatus,
  isRepoAlreadyIndexed,
} from '../services/codeIndexer.js';
import {
  triggerPythonRepoIndex,
} from '../services/pythonAgentService.js';

let analysisHistory = [
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

export const addHistoryEntry = (entry) => {
  analysisHistory = [entry, ...analysisHistory.filter((h) => h.requirementId !== entry.requirementId)];
};

export const handleGetRepositories = (req, res) => {
  const repos = getRepositories();
  return res.status(200).json({ repositories: repos });
};

export const handleScanRepository = async (req, res) => {
  const { repoId, forceReindex } = req.body || {};
  const targetRepoId = repoId || 'repo-1';

  // 1. Run local synchronous AST scan (preserves existing index logic and calculations)
  const result = indexRepository(targetRepoId);
  const repo = result.repo;

  // 2. Validate repository filesystem path strictly against internal catalog
  const pathValidation = resolveValidatedRepoPath(targetRepoId);
  if (!pathValidation.valid) {
    return res.status(200).json({
      message: 'Repository AST scan complete',
      ...result,
      pythonIndexing: {
        success: false,
        status: 'skipped',
        error: pathValidation.error || 'Repository path is inaccessible or does not exist on filesystem',
        chunksStored: 0,
      },
    });
  }

  // 3. Avoid duplicate indexing if safe:
  // If already indexed in this session and forceReindex is not requested, skip re-embedding
  if (isRepoAlreadyIndexed(repo.id) && !forceReindex) {
    return res.status(200).json({
      message: 'Repository AST scan complete',
      ...result,
      pythonIndexing: {
        success: true,
        status: 'already_indexed',
        skippedDuplicate: true,
        chunksStored: repo.pythonChunksStored || 0,
        collectionName: repo.pythonCollectionName || 'code_chunks',
        lastIndexedAt: repo.pythonIndexedAt,
      },
    });
  }

  // 4. Trigger Python multi-agent indexing pipeline with validated path
  const pyResult = await triggerPythonRepoIndex(pathValidation.path);

  // 5. Update repo metadata ONLY if Python confirms success
  if (pyResult.success && pyResult.chunksStored > 0) {
    updateRepoPythonIndexStatus(repo.id, {
      success: true,
      indexedAt: pyResult.indexedAt,
      chunksStored: pyResult.chunksStored,
      collectionName: pyResult.collectionName,
    });
  }

  // 6. Return response preserving frontend contracts and adding clear indexing status
  return res.status(200).json({
    message: 'Repository AST scan complete',
    ...result,
    pythonIndexing: {
      success: pyResult.success,
      status: pyResult.status,
      chunksStored: pyResult.chunksStored || 0,
      filesParsed: pyResult.filesParsed || 0,
      collectionName: pyResult.collectionName || 'code_chunks',
      durationMs: pyResult.durationMs,
      indexedAt: pyResult.indexedAt,
      ...(pyResult.error ? { error: pyResult.error } : {}),
      ...(pyResult.endpoint ? { endpoint: pyResult.endpoint } : {}),
    },
  });
};

export const handleGetDashboardStats = (req, res) => {
  const repos = getRepositories();
  const totalFiles = repos.reduce((acc, r) => acc + (r.filesCount || 0), 0);

  return res.status(200).json({
    connectedRepos: repos.length,
    indexedRequirements: analysisHistory.length + 15,
    aiReviewScore: '96%',
    repoTestCoverage: repos[0]?.coverage || '91%',
    totalTrackedFiles: totalFiles,
    activeRepo: repos[0],
  });
};

export const handleGetHistory = (req, res) => {
  return res.status(200).json({ history: analysisHistory });
};

// Explicit Files Handlers
export const handleGetRepoFiles = (req, res) => {
  const repoId = req.query.repoId || 'repo-1';
  const files = getAllIndexedFilesWithDetails(repoId);
  return res.status(200).json({
    repoId,
    totalFiles: files.length,
    files,
  });
};

export const handleAddExplicitFile = (req, res) => {
  const { repoId = 'repo-1', filePath, content, module } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: 'File path relative to root is required (e.g., src/services/auth.js).' });
  }

  try {
    const file = addExplicitFile(repoId, { filePath, content, module });
    return res.status(201).json({
      message: 'File added and indexed successfully',
      file,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const handleBatchAddExplicitFiles = (req, res) => {
  const { repoId = 'repo-1', files = [] } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Array of files is required.' });
  }

  try {
    const added = batchAddExplicitFiles(repoId, files);
    return res.status(201).json({
      message: `Successfully indexed ${added.length} files.`,
      added,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

export const handleDeleteExplicitFile = (req, res) => {
  const repoId = req.query.repoId || req.body?.repoId || 'repo-1';
  const rawIdentifier = req.params?.fileId || req.query.filePath || req.query.fileId || req.body?.filePath || req.body?.fileId;

  if (!rawIdentifier) {
    return res.status(400).json({ error: 'File ID or filePath is required.' });
  }

  let fileIdentifier = rawIdentifier;
  try {
    fileIdentifier = decodeURIComponent(rawIdentifier);
  } catch {
    fileIdentifier = rawIdentifier;
  }

  const result = removeExplicitFile(repoId, fileIdentifier);
  if (!result.success && result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(200).json({
    message: 'File removed from index registry',
    ...result,
  });
};

export const handleClearAllRepoFiles = (req, res) => {
  const repoId = req.query.repoId || req.body?.repoId || 'repo-1';
  const result = clearAllRepoFiles(repoId);
  return res.status(200).json({
    message: 'All codebase files removed from index registry',
    ...result,
  });
};
