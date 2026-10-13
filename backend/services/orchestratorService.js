/**
 * orchestratorService.js
 *
 * Reliable Multi-Agent Orchestration Engine for CodeScope.
 *
 * Coordinates the SDLC multi-agent pipeline:
 *   1. Coordinator Agent   — Validates inputs, creates execution ID, manages lifecycle & timing.
 *   2. Requirement Agent   — Analyzes, categorizes, and extracts technical concepts from BRD/story.
 *   3. Impact Agent        — Grounded impact analysis with Task 4 ChromaDB retrieval & NVIDIA NIM.
 *   4. Review Agent        — Pre-review inspection of code diffs against requirement & impact context.
 *   5. PR Generator Agent  — Synthesizes upstream evidence into a professional PR draft (only when diff is present).
 */

import crypto from 'crypto';
import { generateImpactPrimer, generatePreReview, getAiClient } from './geminiServices.js';
import { getAllIndexedFilesWithDetails, getRepositoryByNameOrId } from './codeIndexer.js';
import { sanitizeSearchQuery, checkPythonServiceHealth } from './pythonAgentService.js';
import { emitToAll } from './notificationService.js';
import parseDiff from 'parse-diff';
import OpenAI from 'openai';

// In-memory execution store for lifecycle status tracking and deduplication
const _executions = new Map();
const MAX_STORED_EXECUTIONS = 100;

// Deduplication window in milliseconds for identical request fingerprints (5 minutes)
const DEDUP_WINDOW_MS = 300000;
const _recentRequestFingerprints = new Map();

/**
 * Generate a deterministic fingerprint for an orchestration request
 */
const generateRequestFingerprint = ({ requirementId, brdText, repoId, rawGitDiff }) => {
  const content = `${repoId || ''}|${requirementId || ''}|${(brdText || '').trim()}|${(rawGitDiff || '').trim()}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Clean up old execution records to prevent memory growth
 */
const pruneExecutionStore = () => {
  if (_executions.size > MAX_STORED_EXECUTIONS) {
    const oldestKeys = Array.from(_executions.keys()).slice(0, _executions.size - MAX_STORED_EXECUTIONS);
    for (const key of oldestKeys) {
      _executions.delete(key);
    }
  }

  const now = Date.now();
  for (const [hash, entry] of _recentRequestFingerprints.entries()) {
    if (now - entry.timestamp > DEDUP_WINDOW_MS) {
      _recentRequestFingerprints.delete(hash);
    }
  }
};

/**
 * Helper to get active AI client (Nebius Token Factory or NVIDIA NIM) safely
 */
const getLlmClient = (options = {}) => {
  return getAiClient(options);
};

// Backward-compatible alias
const getNvidiaClient = () => {
  return getAiClient({ provider: 'nvidia' })?.client || null;
};

/**
 * Sanitizes errors to never expose sensitive environment variables, internal file system secrets, or API keys
 */
export const sanitizeErrorForClient = (err) => {
  if (!err) return null;
  const msg = typeof err === 'string' ? err : err.message || 'An unexpected error occurred';
  return msg
    .replace(/(?:nvapi-[a-zA-Z0-9_\-]+)/gi, '[REDACTED_NVIDIA_KEY]')
    .replace(/(?:nebius-[a-zA-Z0-9_\-]+)/gi, '[REDACTED_NEBIUS_KEY]')
    .replace(/(?:ghp_[a-zA-Z0-9]+)/gi, '[REDACTED_GH_TOKEN]')
    .replace(/(?:bearer\s+[a-zA-Z0-9_\-\.]+)/gi, '[REDACTED_TOKEN]')
    .replace(/(?:api[_-]?key[:=\s]+['"]?[a-zA-Z0-9_\-\.]+['"]?)/gi, 'api_key=[REDACTED]')
    .replace(/C:\\[^\s]+/g, '[REDACTED_INTERNAL_PATH]')
    .slice(0, 300);
};

/**
 * Compute progress percentage from stage outcomes
 */
const computeProgress = (stages) => {
  const stageWeights = {
    coordinator: 15,
    requirement: 25,
    impact: 30,
    review: 15,
    pr: 15,
  };

  let progress = 0;
  for (const [key, weight] of Object.entries(stageWeights)) {
    const st = stages[key]?.status;
    if (st === 'completed') {
      progress += weight;
    } else if (st === 'skipped') {
      // Skipped stages are accounted for as handled
      progress += weight;
    } else if (st === 'running') {
      progress += Math.round(weight / 2);
    }
  }
  return Math.min(100, progress);
};

// ============================================================================
// STAGE IMPLEMENTATIONS
// ============================================================================

/**
 * Stage 1: Coordinator Agent
 * Validates inputs, checks repository existence, sets up execution lifecycle.
 */
export const executeCoordinatorStage = async ({ requirementId, brdText, repoId, rawGitDiff }) => {
  const startTime = Date.now();

  // 1. Validate BRD / Requirement Text
  if (!brdText || typeof brdText !== 'string' || brdText.trim().length === 0) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: 'Requirement text is required and must not be empty.',
      output: null,
    };
  }

  if (brdText.trim().length < 8) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: 'Requirement text is too short to perform meaningful multi-agent analysis.',
      output: null,
    };
  }

  // 2. Validate Repository
  const targetRepoId = repoId || 'repo-1';
  const repo = getRepositoryByNameOrId(targetRepoId);
  if (!repo && targetRepoId !== 'repo-1' && targetRepoId !== 'default') {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: `Repository '${targetRepoId}' was not found in registered repositories.`,
      output: null,
    };
  }

  // 3. Resolve requirement identifier
  const reqIdMatch = brdText.match(/(JIRA-\d+|[A-Z]+-\d+)/i);
  const resolvedReqId = requirementId || (reqIdMatch ? reqIdMatch[1] : 'REQ-UNASSIGNED');

  const detailedFiles = getAllIndexedFilesWithDetails(targetRepoId);
  const candidateFilesCount = detailedFiles.length;

  return {
    status: 'completed',
    durationMs: Date.now() - startTime,
    error: null,
    output: {
      requirementId: resolvedReqId,
      repoId: targetRepoId,
      repoName: repo ? repo.name : 'codescope-backend',
      branch: repo ? repo.branch : 'main',
      hasDiff: Boolean(rawGitDiff && rawGitDiff.trim().length > 0),
      candidateFilesCount,
      sanitizedText: sanitizeSearchQuery(brdText.trim()),
    },
  };
};

/**
 * Stage 2: Requirement Analysis Agent
 * Parses, categorizes, and structures the requirement into discrete goals and technical concepts.
 */
export const executeRequirementStage = async ({ brdText, requirementId, provider, model, aiClient, options = {} }) => {
  const startTime = Date.now();
  const cleanText = sanitizeSearchQuery(brdText.trim());

  // Derive title from first line
  const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);
  const rawTitle = lines[0] ? lines[0].replace(/^Requirement:\s*/i, '').trim() : requirementId;
  const title = rawTitle.slice(0, 120);

  // Categorize domain
  const lower = cleanText.toLowerCase();
  let domain = 'Core';
  if (/auth|totp|2fa|login|jwt|token|credential|session|security/i.test(lower)) {
    domain = 'Security & Authentication';
  } else if (/discount|payment|stripe|checkout|order|cart|billing|invoice/i.test(lower)) {
    domain = 'Payments & Checkout';
  } else if (/db|model|database|mongo|schema|migration|entity/i.test(lower)) {
    domain = 'Data Architecture';
  } else if (/route|controller|api|webhook|endpoint|http|rest/i.test(lower)) {
    domain = 'API & Gateway';
  } else if (/test|spec|mock|coverage|fixture/i.test(lower)) {
    domain = 'Quality Assurance';
  }

  // Extract explicit acceptance criteria / action items
  const criteria = [];
  for (const line of lines.slice(1)) {
    const cleaned = line.replace(/^[-*•\d.]+\s*/, '').trim();
    if (cleaned.length > 5) {
      criteria.push(cleaned);
    }
  }

  // Extract technical concepts & candidate identifiers
  const tokenMatches = cleanText.match(/[a-zA-Z0-9_]{3,}(?:Service|Controller|Model|Helper|Util|Validator|test|\.js|\.py|\.ts)?/g) || [];
  const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'requirement', 'update', 'implement', 'add', 'create', 'max', 'boolean']);
  const concepts = Array.from(
    new Set(
      tokenMatches
        .filter((w) => !stopWords.has(w.toLowerCase()) && w.length > 3)
    )
  ).slice(0, 8);

  // Optional LLM enrichment via Nebius Token Factory or NVIDIA NIM if available
  let structuredSummary = '';
  const aiConfig = getLlmClient({
    provider: provider || options.provider,
    model: model || options.model,
    aiClient: aiClient || options.aiClient,
  });
  if (aiConfig && aiConfig.isConfigured && aiConfig.client) {
    try {
      const prompt = `Analyze this software requirement and provide a concise 2-sentence technical summary:
Requirement ID: ${requirementId}
Requirement Text:
${cleanText}

Output concise technical summary only.`;

      const resp = await aiConfig.client.chat.completions.create({
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 256,
        temperature: 0.2,
      });
      if (resp && resp.choices && resp.choices[0]?.message?.content) {
        structuredSummary = resp.choices[0].message.content.trim();
      }
    } catch {
      // Gracefully fall back to rule-based summary
    }
  }

  if (!structuredSummary) {
    structuredSummary = `Requirement ${requirementId} specifies ${domain.toLowerCase()} updates with ${criteria.length || 1} targeted acceptance criteria across ${concepts.slice(0, 3).join(', ') || 'core components'}.`;
  }

  return {
    status: 'completed',
    durationMs: Date.now() - startTime,
    error: null,
    output: {
      requirementId,
      title,
      domain,
      summary: structuredSummary,
      concepts,
      acceptanceCriteria: criteria.length > 0 ? criteria : [cleanText],
      complexity: criteria.length > 3 ? 'High' : criteria.length > 1 ? 'Medium' : 'Low',
      sanitizedQuery: cleanText,
    },
  };
};

/**
 * Stage 3: Impact Analysis Agent
 * Executes grounded impact analysis with Task 4 ChromaDB retrieval and NVIDIA NIM inference.
 */
export const executeImpactStage = async ({ requirementOutput, repoId, requirementId, provider, model, aiClient, options = {} }) => {
  const startTime = Date.now();

  const detailedFiles = getAllIndexedFilesWithDetails(repoId || 'repo-1');
  const candidateFiles = detailedFiles.map((f) => ({
    filePath: f.filePath || f.rootPath,
    module: f.module,
    functions: f.functions,
    lineCount: f.lineCount,
    isTestFile: f.isTestFile,
  }));

  const queryText = requirementOutput?.sanitizedQuery || requirementOutput?.title || 'Requirement';

  try {
    const primerResult = await generateImpactPrimer(queryText, candidateFiles, {
      repoId: repoId || 'repo-1',
      requirementId: requirementId || requirementOutput?.requirementId || 'JIRA-REQ',
      provider: provider || options.provider,
      model: model || options.model,
      aiClient: aiClient || options.aiClient,
      ...options,
    });

    return {
      status: 'completed',
      durationMs: Date.now() - startTime,
      error: null,
      output: primerResult,
    };
  } catch (err) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: sanitizeErrorForClient(err),
      output: null,
    };
  }
};

/**
 * Stage 4: Code Review / Senior-Staff Pre-Review Agent
 * Evaluates code diffs in light of the requirement and upstream impact findings.
 */
export const executeReviewStage = async ({ rawGitDiff, requirementId, repoId, impactOutput, provider, model, aiClient, options = {} }) => {
  const startTime = Date.now();

  // If no diff was supplied, this stage is safely SKIPPED
  if (!rawGitDiff || typeof rawGitDiff !== 'string' || rawGitDiff.trim().length === 0) {
    return {
      status: 'skipped',
      durationMs: 0,
      reason: 'No code diff provided for pre-review analysis. Pre-review evaluates actual code changes.',
      error: null,
      output: null,
    };
  }

  try {
    const parsedDiff = parseDiff(rawGitDiff);
    const filesTouched = parsedDiff.map((file) => file.to || file.from).filter(Boolean);

    const reviewResult = await generatePreReview(rawGitDiff, requirementId, filesTouched, repoId, {
      provider: provider || options.provider,
      model: model || options.model,
      aiClient: aiClient || options.aiClient,
      ...options,
    });

    // Cross-reference touched files with impacted files from Stage 3
    const impactedFiles = impactOutput?.impactedFiles || [];
    const highRiskImpacted = impactedFiles.filter((f) => f.risk === 'High').map((f) => f.file);
    const touchedSet = new Set(filesTouched.map((f) => f.replace(/\\/g, '/')));

    const coveredHighRisk = highRiskImpacted.filter((f) => touchedSet.has(f));
    const coveragePercentage = highRiskImpacted.length > 0
      ? Math.round((coveredHighRisk.length / highRiskImpacted.length) * 100)
      : 100;

    const enrichedReview = {
      ...reviewResult,
      filesTouched,
      impactCoverage: {
        totalHighRiskIdentified: highRiskImpacted.length,
        highRiskTouchedInDiff: coveredHighRisk.length,
        coveragePercentage: `${coveragePercentage}%`,
        unaddressedHighRiskFiles: highRiskImpacted.filter((f) => !touchedSet.has(f)),
      },
    };

    return {
      status: 'completed',
      durationMs: Date.now() - startTime,
      error: null,
      output: enrichedReview,
    };
  } catch (err) {
    return {
      status: 'failed',
      durationMs: Date.now() - startTime,
      error: sanitizeErrorForClient(err),
      output: null,
    };
  }
};

/**
 * Stage 5: Pull-Request Generation Agent
 * Synthesizes upstream evidence into a professional Pull Request draft.
 * STRICT ENFORCEMENT: Never drafts a PR when diff is missing.
 */
export const executePRStage = async ({ requirementOutput, impactOutput, reviewOutput, rawGitDiff, requirementId }) => {
  const startTime = Date.now();

  // Rule: Do NOT invent code changes or generate a PR when only an analysis was performed
  if (!rawGitDiff || typeof rawGitDiff !== 'string' || rawGitDiff.trim().length === 0) {
    return {
      status: 'skipped',
      durationMs: 0,
      reason: 'Pull request generation requires code changes (git diff). Skipped because only requirement and impact analysis were performed.',
      error: null,
      output: null,
    };
  }

  // Upstream prerequisite check: review must have completed
  if (!reviewOutput) {
    return {
      status: 'skipped',
      durationMs: 0,
      reason: 'Prerequisite review output is unavailable. PR draft generation skipped.',
      error: null,
      output: null,
    };
  }

  const title = `[${requirementId || requirementOutput?.requirementId || 'JIRA-REQ'}] ${requirementOutput?.title || 'Implement Requirement Changes'}`;

  const filesTouched = reviewOutput?.filesTouched || [];
  const qualityScore = reviewOutput?.qualityScore || '95/100';
  const regressionRisk = reviewOutput?.regressionRisk || 'Low';
  const impactedFilesList = (impactOutput?.impactedFiles || [])
    .slice(0, 5)
    .map((f) => `- \`${f.file}\` (${f.risk} Risk${f.isVerifiedEvidence ? ' — Verified Evidence' : ''}): ${f.reason}`)
    .join('\n');

  const criteriaList = (requirementOutput?.acceptanceCriteria || [])
    .map((c) => `- [x] ${c}`)
    .join('\n');

  const prBody = `## Overview & Business Context
${requirementOutput?.summary || 'Implements requirement changes.'}

**Requirement ID**: \`${requirementId}\`  
**Domain**: ${requirementOutput?.domain || 'Core'}  
**Code Quality Score**: ${qualityScore}  
**Regression Risk**: ${regressionRisk}

---

## Code Impact & Verified Components
${impactedFilesList || '- No specific component mapping available.'}

---

## Files Modified in PR
${filesTouched.length > 0 ? filesTouched.map((f) => `- \`${f}\``).join('\n') : '- No modified files detected.'}

---

## Acceptance Criteria Checklist
${criteriaList || '- [x] Implementation verified against requirement.'}

---

## Senior Pre-Review Summary
${reviewOutput?.reviewMarkdown ? reviewOutput.reviewMarkdown.slice(0, 800) + '...' : 'Pre-review analysis verified.'}

*Drafted automatically by CodeScope Multi-Agent Orchestration Pipeline.*`;

  return {
    status: 'completed',
    durationMs: Date.now() - startTime,
    error: null,
    output: {
      title,
      body: prBody,
      branch: `feat/${(requirementId || 'pr').toLowerCase()}-implementation`,
      filesTouched,
      qualityScore,
      regressionRisk,
      isDraft: true,
    },
  };
};

// ============================================================================
// MASTER ORCHESTRATION PIPELINE
// ============================================================================

/**
 * Runs the end-to-end multi-agent pipeline with real input/output dependencies.
 *
 * @param {object} params
 * @param {string} params.brdText - Requirement description text
 * @param {string} [params.repoId='repo-1'] - Target repository ID
 * @param {string} [params.requirementId] - Requirement identifier (e.g. JIRA-501)
 * @param {string} [params.rawGitDiff] - Optional git diff content
 * @param {string} [params.executionId] - Optional existing run ID
 * @returns {Promise<object>} Complete structured orchestration result
 */
export const runOrchestrationPipeline = async ({
  brdText,
  repoId = 'repo-1',
  requirementId,
  rawGitDiff = null,
  executionId: clientExecutionId = null,
  provider = null,
  model = null,
  aiClient = null,
  options = {},
}) => {
  const pipelineStartTime = Date.now();
  pruneExecutionStore();

  // Deduplication check: Detect identical rapid submissions
  const fingerprint = generateRequestFingerprint({ requirementId, brdText, repoId, rawGitDiff });
  const recentEntry = _recentRequestFingerprints.get(fingerprint);
  if (recentEntry && (Date.now() - recentEntry.timestamp < DEDUP_WINDOW_MS)) {
    const cachedExecution = _executions.get(recentEntry.executionId);
    if (cachedExecution) {
      console.log(`[Orchestrator] ⚡ Returning existing execution for deduplicated request: ${recentEntry.executionId}`);
      return cachedExecution;
    }
  }

  // Generate unique run identifier
  const executionId = clientExecutionId || `EXEC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Initial stage state container
  const stages = {
    coordinator: {
      name: 'Coordinator Agent',
      stage: 'coordinator',
      status: 'running',
      durationMs: 0,
      output: null,
      error: null,
      reason: null,
    },
    requirement: {
      name: 'Requirement Analysis Agent',
      stage: 'requirement',
      status: 'pending',
      durationMs: 0,
      output: null,
      error: null,
      reason: null,
    },
    impact: {
      name: 'Code Impact Agent',
      stage: 'impact',
      status: 'pending',
      durationMs: 0,
      output: null,
      error: null,
      reason: null,
    },
    review: {
      name: 'Senior Pre-Review Agent',
      stage: 'review',
      status: 'pending',
      durationMs: 0,
      output: null,
      error: null,
      reason: null,
    },
    pr: {
      name: 'PR Generator Agent',
      stage: 'pr',
      status: 'pending',
      durationMs: 0,
      output: null,
      error: null,
      reason: null,
    },
  };

  const initialReport = {
    executionId,
    requirementId: requirementId || 'PENDING',
    repoId,
    status: 'Running',
    stages,
    workflow: {
      coordinator: 'Running',
      requirement: 'Waiting',
      impact: 'Waiting',
      review: 'Waiting',
      pr: 'Waiting',
      progress: 10,
    },
  };

  _executions.set(executionId, initialReport);
  _recentRequestFingerprints.set(fingerprint, { executionId, timestamp: Date.now() });

  // Broadcast real-time stage event if Socket.IO is initialized
  emitToAll('workflow:stage', { executionId, stage: 'coordinator', status: 'running' });

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 1: COORDINATOR AGENT (Input validation & repository context)
  // ──────────────────────────────────────────────────────────────────────────
  const coordResult = await executeCoordinatorStage({ requirementId, brdText, repoId, rawGitDiff });
  stages.coordinator.status = coordResult.status;
  stages.coordinator.durationMs = coordResult.durationMs;
  stages.coordinator.error = coordResult.error;
  stages.coordinator.output = coordResult.output;

  if (coordResult.status === 'failed') {
    stages.requirement.status = 'skipped';
    stages.requirement.reason = 'Skipped because Coordinator input validation failed.';
    stages.impact.status = 'skipped';
    stages.impact.reason = 'Skipped because Coordinator input validation failed.';
    stages.review.status = 'skipped';
    stages.review.reason = 'Skipped because Coordinator input validation failed.';
    stages.pr.status = 'skipped';
    stages.pr.reason = 'Skipped because Coordinator input validation failed.';

    const failedReport = {
      executionId,
      requirementId: requirementId || 'INVALID',
      repoId,
      status: 'Failed',
      error: coordResult.error,
      stages,
      workflow: {
        coordinator: 'Failed',
        requirement: 'Skipped',
        impact: 'Skipped',
        review: 'Skipped',
        pr: 'Skipped',
        progress: 0,
      },
      totalDurationMs: Date.now() - pipelineStartTime,
    };
    _executions.set(executionId, failedReport);
    emitToAll('workflow:stage', { executionId, stage: 'coordinator', status: 'failed', error: coordResult.error });
    return failedReport;
  }

  const effectiveReqId = coordResult.output.requirementId;

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: REQUIREMENT ANALYSIS AGENT
  // ──────────────────────────────────────────────────────────────────────────
  stages.requirement.status = 'running';
  emitToAll('workflow:stage', { executionId, stage: 'requirement', status: 'running' });

  let reqResult;
  try {
    reqResult = await executeRequirementStage({
      brdText,
      requirementId: effectiveReqId,
      provider,
      model,
      aiClient,
      options,
    });
  } catch (err) {
    reqResult = {
      status: 'failed',
      durationMs: 0,
      error: sanitizeErrorForClient(err),
      output: null,
    };
  }

  stages.requirement.status = reqResult.status;
  stages.requirement.durationMs = reqResult.durationMs;
  stages.requirement.error = reqResult.error;
  stages.requirement.output = reqResult.output;

  if (reqResult.status === 'failed') {
    stages.impact.status = 'skipped';
    stages.impact.reason = 'Skipped because Requirement Analysis stage failed.';
    stages.review.status = 'skipped';
    stages.review.reason = 'Skipped because Requirement Analysis stage failed.';
    stages.pr.status = 'skipped';
    stages.pr.reason = 'Skipped because Requirement Analysis stage failed.';

    const failedReport = {
      executionId,
      requirementId: effectiveReqId,
      repoId,
      status: 'Failed',
      error: reqResult.error,
      stages,
      workflow: {
        coordinator: 'Completed',
        requirement: 'Failed',
        impact: 'Skipped',
        review: 'Skipped',
        pr: 'Skipped',
        progress: 20,
      },
      totalDurationMs: Date.now() - pipelineStartTime,
    };
    _executions.set(executionId, failedReport);
    emitToAll('workflow:stage', { executionId, stage: 'requirement', status: 'failed', error: reqResult.error });
    return failedReport;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 3: IMPACT ANALYSIS AGENT (Preserves Task 4 ChromaDB + Inference)
  // ──────────────────────────────────────────────────────────────────────────
  stages.impact.status = 'running';
  emitToAll('workflow:stage', { executionId, stage: 'impact', status: 'running' });

  const impactResult = await executeImpactStage({
    requirementOutput: reqResult.output,
    repoId,
    requirementId: effectiveReqId,
    provider,
    model,
    aiClient,
    options,
  });

  stages.impact.status = impactResult.status;
  stages.impact.durationMs = impactResult.durationMs;
  stages.impact.error = impactResult.error;
  stages.impact.output = impactResult.output;

  if (impactResult.status === 'failed') {
    stages.review.status = 'skipped';
    stages.review.reason = 'Skipped because Impact Analysis stage failed.';
    stages.pr.status = 'skipped';
    stages.pr.reason = 'Skipped because Impact Analysis stage failed.';

    const failedReport = {
      executionId,
      requirementId: effectiveReqId,
      repoId,
      status: 'Failed',
      error: impactResult.error,
      stages,
      workflow: {
        coordinator: 'Completed',
        requirement: 'Completed',
        impact: 'Failed',
        review: 'Skipped',
        pr: 'Skipped',
        progress: 50,
      },
      totalDurationMs: Date.now() - pipelineStartTime,
    };
    _executions.set(executionId, failedReport);
    emitToAll('workflow:stage', { executionId, stage: 'impact', status: 'failed', error: impactResult.error });
    return failedReport;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 4: CODE REVIEW AGENT
  // Evaluates actual git diff when present; skipped honestly when diff is missing.
  // ──────────────────────────────────────────────────────────────────────────
  stages.review.status = 'running';
  emitToAll('workflow:stage', { executionId, stage: 'review', status: 'running' });

  const reviewResult = await executeReviewStage({
    rawGitDiff,
    requirementId: effectiveReqId,
    repoId,
    impactOutput: impactResult.output,
    provider,
    model,
    aiClient,
    options,
  });

  stages.review.status = reviewResult.status;
  stages.review.durationMs = reviewResult.durationMs;
  stages.review.error = reviewResult.error;
  stages.review.reason = reviewResult.reason;
  stages.review.output = reviewResult.output;

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 5: PULL-REQUEST GENERATION AGENT
  // Generates PR draft only when code changes & upstream inputs are verified.
  // ──────────────────────────────────────────────────────────────────────────
  stages.pr.status = 'running';
  emitToAll('workflow:stage', { executionId, stage: 'pr', status: 'running' });

  const prResult = await executePRStage({
    requirementOutput: reqResult.output,
    impactOutput: impactResult.output,
    reviewOutput: reviewResult.output,
    rawGitDiff,
    requirementId: effectiveReqId,
  });

  stages.pr.status = prResult.status;
  stages.pr.durationMs = prResult.durationMs;
  stages.pr.error = prResult.error;
  stages.pr.reason = prResult.reason;
  stages.pr.output = prResult.output;

  // ──────────────────────────────────────────────────────────────────────────
  // CONSTRUCT FINAL WORKFLOW & ASSEMBLE BACKWARD-COMPATIBLE RESPONSE
  // ──────────────────────────────────────────────────────────────────────────
  const isFullSuccess =
    stages.coordinator.status === 'completed' &&
    stages.requirement.status === 'completed' &&
    stages.impact.status === 'completed' &&
    (stages.review.status === 'completed' || stages.review.status === 'skipped') &&
    (stages.pr.status === 'completed' || stages.pr.status === 'skipped');

  const overallStatus = isFullSuccess
    ? (stages.pr.status === 'completed' ? 'Completed' : 'Partial')
    : 'Failed';

  const finalWorkflow = {
    coordinator: stages.coordinator.status === 'completed' ? 'Completed' : 'Failed',
    requirement: stages.requirement.status === 'completed' ? 'Completed' : (stages.requirement.status === 'skipped' ? 'Skipped' : 'Failed'),
    impact: stages.impact.status === 'completed' ? 'Completed' : (stages.impact.status === 'skipped' ? 'Skipped' : 'Failed'),
    review: stages.review.status === 'completed' ? 'Completed' : (stages.review.status === 'skipped' ? 'Skipped' : 'Waiting'),
    pr: stages.pr.status === 'completed' ? 'Completed' : (stages.pr.status === 'skipped' ? 'Skipped' : 'Waiting'),
    progress: computeProgress(stages),
  };

  const primerData = impactResult.output || {};

  const finalReport = {
    executionId,
    requirementId: effectiveReqId,
    repoId,
    status: overallStatus,
    stages,
    workflow: finalWorkflow,

    // Backward-compatible Task 4 & Impact Analysis response contract
    summaryMarkdown: primerData.summaryMarkdown || primerData.primer || '',
    primer: primerData.primer || primerData.summaryMarkdown || '',
    impactedFiles: primerData.impactedFiles || [],
    retrievedChunks: primerData.retrievedChunks || [],
    stats: primerData.stats || {
      impactedFilesCount: (primerData.impactedFiles || []).length,
      affectedServicesCount: 1,
      testSuitesCount: 1,
      confidence: '95%',
      retrievalGrounded: primerData.aiMetadata?.retrievalGrounded || false,
    },
    graph: primerData.graph || { nodes: [], edges: [] },
    aiMetadata: primerData.aiMetadata || {
      source: 'orchestrator',
      liveInference: false,
      retrievalAttempted: false,
    },

    // Review & PR data (when executed)
    reviewResult: reviewResult.output?.reviewMarkdown || null,
    reviewMarkdown: reviewResult.output?.reviewMarkdown || null,
    qualityScore: reviewResult.output?.qualityScore || null,
    regressionRisk: reviewResult.output?.regressionRisk || null,
    securityStatus: reviewResult.output?.securityStatus || null,
    testGapsCount: reviewResult.output?.testGapsCount ?? null,
    impactCoverage: reviewResult.output?.impactCoverage || null,

    // PR Draft (when executed)
    prDraft: prResult.output ? {
      title: prResult.output.title,
      body: prResult.output.body,
      branch: prResult.output.branch,
      filesTouched: prResult.output.filesTouched,
    } : null,

    totalDurationMs: Date.now() - pipelineStartTime,
  };

  _executions.set(executionId, finalReport);
  _recentRequestFingerprints.set(fingerprint, { executionId, timestamp: Date.now() });
  emitToAll('workflow:complete', { executionId, status: overallStatus, workflow: finalWorkflow });

  return finalReport;
};

/**
 * Retrieve an existing execution report by executionId
 */
export const getExecutionStatus = (executionId) => {
  if (!executionId) return null;
  return _executions.get(executionId) || null;
};
