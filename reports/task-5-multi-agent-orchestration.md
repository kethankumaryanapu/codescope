# CodeScope Task 5 — Reliable Multi-Agent Orchestration Report

**Document Date:** October 2026  
**Status:** Completed & Verified  
**Branch / Workspace:** `codescope`  
**Test Suite Status:** 72/72 Assertions Passing (100%)  
**Regression Status:** Task 4 (63/63 Passing), Semantic Retrieval (36/36 Passing), Repo Indexing (23/23 Passing)

---

## Executive Summary

Task 5 delivers a reliable, production-grade multi-agent orchestration pipeline for CodeScope. It coordinates five specialized agents—**Coordinator Agent**, **Requirement Analysis Agent**, **Impact Analysis Agent**, **Senior Pre-Review Agent**, and **Pull-Request (PR) Generator Agent**—with authentic input/output dependencies, truthful lifecycle execution states, bounded resilience, and strict protection against AI hallucination.

Crucially, Task 5 preserves all Task 4 retrieval-grounded semantic enhancements (ChromaDB vector search, NVIDIA NIM live inference, and verified evidence metadata), passes retrieved evidence and technical requirement context downstream to code review, and guarantees that pull requests are never drafted without real code modifications.

---

## 1. Existing Architecture Discovered

Prior to Task 5, an audit of the frontend and backend revealed critical architectural disconnects:

### 1.1 Backend Disconnects
- **Isolated Endpoints:** The Node.js Express server (`codescope/backend/server.js` and `routes/apiRoutes.js`) exposed disparate endpoints:
  - `/api/impact-analysis` (handled by `agentController.handleImpactAnalysis`) invoked only `generateImpactPrimer()`.
  - `/api/pr-review` invoked `generatePreReview()`.
  - No unified orchestrator connected them or coordinated data flow.
- **Python Fast-API Pipeline Divergence:** The Python agent pipeline (`codescope/backend/python_service/app/services/orchestrator.py`) had a standalone multi-agent definition (`CoordinatorAgent`, `RequirementAnalysisAgent`, `ImpactAgent`, `SeniorReviewAgent`, `PRGeneratorAgent`), but was not wired to the active Node.js API routes or the React UI.
- **Missing Data Handoffs:** Code impact analysis results (impacted files, AST dependency graphs, ChromaDB retrieved chunks) were never passed into the pre-review agent; pre-review inspected diffs in isolation without knowing what the requirement was or which components were impacted.
- **Phantom PR Generation:** PR generation was either bypassed or triggered without verifying that a genuine git diff existed.

### 1.2 Frontend Disconnects
- **Mock State in UI:** In `frontend/src/context/AnalysisContext.jsx` and `frontend/src/components/IntelligenceCore.jsx`, the agent lifecycle states (`Coordinator: "Ready"`, `Requirement: "Analyzing"`, `Impact: "Evaluating"`, `Review: "Reviewing"`, `PR: "Pending"`) were partially hardcoded or animated locally without reflecting real backend stage progression.
- **Empty Agent Definitions:** The client-side agent files in `frontend/src/agents/` (`CoordinatorAgent.js`, `RequirementAgent.js`, `ImpactAgent.js`, `ReviewAgent.js`, `PRAgent.js`) were 0-byte blank files.
- **No Handling for Skipped Stages:** The UI components lacked styling or iconography for honest `"Skipped"` states when prerequisites (such as git diffs) were absent.

---

## 2. Changes Implemented

### 2.1 Unified Orchestrator Service (`codescope/backend/services/orchestratorService.js`)
Created a dedicated, high-reliability orchestration service in the Node.js backend:
- **Unique Execution Tracking:** Every pipeline invocation receives an unambiguous `executionId` (`EXEC-<timestamp>-<randomHex>`) or adopts a client-supplied run ID.
- **Deterministic Deduplication:** Requests are fingerprinted via SHA-256 (`repoId`, `requirementId`, `brdText`, `rawGitDiff`). Rapid duplicate submissions within a 5-minute window (`DEDUP_WINDOW_MS = 300000`) instantly return cached execution reports without redundant model invocations.
- **Execution In-Memory Store & Lookup:** Implemented `getExecutionStatus(executionId)` with bounded memory pruning (`MAX_STORED_EXECUTIONS = 100`).
- **Real-Time Stage Broadcasting:** Stage state transitions (`running`, `completed`, `failed`, `skipped`) emit events via Socket.IO (`emitToAll('workflow:stage', ...)`).
- **Error Sanitization:** Built `sanitizeErrorForClient()` to scrub NVIDIA NIM keys (`nvapi-*`), GitHub tokens (`ghp_*`), bearer tokens, and internal Windows paths (`C:\...`) from client responses.

### 2.2 Genuine Multi-Agent Pipeline Stages

| Stage | Agent Name | Inputs Received | Core Responsibilities | Outputs Produced | Honest Skip / Failure Rules |
|---|---|---|---|---|---|
| **1** | **Coordinator Agent** | `brdText`, `repoId`, `requirementId`, `rawGitDiff` | Validates minimum length (>= 15 chars), verifies repository exists in index, generates run ID, extracts/normalizes Jira ID. | `requirementId`, `sanitizedBrd`, `repoContext`, `hasDiff` | Fails pipeline if text < 15 chars or empty. On failure, downstream stages are marked `skipped`. |
| **2** | **Requirement Agent** | `sanitizedBrd`, `requirementId` | Extracts domain category (e.g. *Security & Authentication*, *Data Pipeline*), technical concepts, impacted architectural layers, and acceptance checklists. | `domain`, `technicalConcepts`, `impactedLayers`, `acceptanceChecklist`, `analysisMarkdown` | Fails gracefully with fallback classification if LLM parsing errors occur. |
| **3** | **Impact Agent** | `requirementOutput`, `repoId` | Runs ChromaDB semantic retrieval (top 5 chunks) via Python daemon, enriches prompt, calls live NVIDIA NIM inference, builds AST dependency graph. | `summaryMarkdown`, `impactedFiles`, `retrievedChunks`, `stats`, `graph`, `aiMetadata` | On ChromaDB or NIM failure, activates AST heuristic fallback and marks `fallbackUsed: true` without failing pipeline. |
| **4** | **Review Agent** | `rawGitDiff`, `requirementOutput`, `impactOutput`, `repoId` | Cross-references touched files in git diff against `impactedFiles` from Stage 3; evaluates code quality, regression risk, security implications, and test coverage gaps. | `reviewMarkdown`, `qualityScore`, `regressionRisk`, `securityStatus`, `impactCoverage`, `testGapsCount` | **Skipped** when `rawGitDiff` is empty or absent. Clearly records reason: *"Review skipped: No code diff was supplied..."*. |
| **5** | **PR Generator Agent** | `rawGitDiff`, `requirementOutput`, `impactOutput`, `reviewOutput` | Synthesizes upstream requirement context, impact findings, and review remarks into a structured PR draft (Title, Branch, Summary, Changes, Impact Scope). | `title`, `body`, `branch`, `filesTouched` | **Skipped** when `rawGitDiff` is empty or upstream Review is missing. Guarantees `prDraft === null` to prevent phantom PR generation. |

### 2.3 Backend Controller & API Routes
- **`codescope/backend/controllers/agentController.js`**:
  - `handleImpactAnalysis`: Updated to delegate directly to `runOrchestrationPipeline()`, guaranteeing full 100% backward compatibility with all Task 4 fields (`summaryMarkdown`, `primer`, `impactedFiles`, `retrievedChunks`, `stats`, `graph`, `aiMetadata`) while adding Task 5 fields (`executionId`, `stages`, `workflow`).
  - Added `handleOrchestrate`: Dedicated full pipeline execution endpoint supporting `rawGitDiff`.
  - Added `handleGetExecutionStatus`: Polling / status query endpoint for run IDs.
- **`codescope/backend/routes/apiRoutes.js`**:
  - Registered `POST /api/orchestrate` and `POST /api/workflow/run`.
  - Registered `GET /api/orchestrate/status/:executionId`.

### 2.4 Frontend Modernization & State Fidelity
- **`frontend/src/services/api.js`**: Added `orchestratePipeline()` and `fetchExecutionStatus()`, passed `rawGitDiff` in `analyzeImpact()`.
- **`frontend/src/context/AnalysisContext.jsx`**:
  - Replaced hardcoded default states with honest `'Waiting'` / `'Ready'` states.
  - Bound real backend `workflow` states and stage metadata directly into React state.
  - Added `runFullPipeline(options)` supporting git diff inputs.
- **`AIStatus.jsx`, `AgentCard.jsx`, `IntelligenceCore.jsx`, `PipelineStatus.jsx`**:
  - Added visual badge and icon support for the `'Skipped'` status (`#64748b`, `—`).
  - Progress bar dynamically scales using real backend `workflow.progress` (0% to 100%).
- **Populated Client Agent Modules (`frontend/src/agents/`)**:
  - Implemented `CoordinatorAgent.js`, `RequirementAgent.js`, `ImpactAgent.js`, `ReviewAgent.js`, and `PRAgent.js` with structured input validation and API communication wrappers.
- **`WorkspaceHub.jsx`**:
  - PR Generation panel bound to real `analysisData?.prDraft`.
  - Displays clear guidance and honest status when PR generation is withheld due to missing code diffs.

---

## 3. Actual Execution Order & Data Flow

```
[User Input: BRD Text + Optional Git Diff + Repo ID]
                          │
                          ▼
            STAGE 1: Coordinator Agent
            ├── Validates input constraints (len >= 15)
            ├── Generates EXEC-<id>
            └── Extracts Jira/Requirement ID
                          │
             ┌────────────┴────────────┐
             │ Success                 │ Validation Failure
             ▼                         ▼
   STAGE 2: Requirement Agent    Pipeline FAILS (Overall: "Failed")
   ├── Domain categorization     Downstream stages marked SKIPPED
   ├── Architectural layers      Progress = 0%
   └── Acceptance criteria
             │
             ▼
   STAGE 3: Impact Analysis Agent (Preserving Task 4)
   ├── ChromaDB Semantic Search (Top-5 chunks)
   ├── Prompt Enrichment with code chunks
   ├── NVIDIA NIM LLM Inference (meta/llama-3.2-11b-vision-instruct)
   └── AST Dependency Graph generation
             │
             ├───────────────────────────────────────────┐
             │ Has Code Diff?                            │ No Code Diff
             ▼                                           ▼
   STAGE 4: Senior Pre-Review Agent            STAGE 4: SKIPPED
   ├── Cross-reference diff with Impact files  ├── Rationale: "No git diff supplied"
   ├── Security & Regression scoring           STAGE 5: SKIPPED
   │                                           ├── Rationale: "Requires code changes"
   ▼                                           └── prDraft = null
   STAGE 5: PR Generator Agent                 Pipeline Status: "Partial"
   ├── Synthesizes Req + Impact + Review
   ├── Drafts Branch & Markdown PR Body
   └── prDraft populated
             │
             ▼
   Pipeline Status: "Completed" (Progress: 100%)
```

---

## 4. Error and Partial-Result Behavior

1. **Validation Failure (Stage 1):**
   - If requirement text is under 15 characters, Coordinator fails with: *"Requirement text too short (minimum 15 characters required)."*
   - Downstream stages (`requirement`, `impact`, `review`, `pr`) are immediately marked `skipped` with explicit reason messages.
   - Overall pipeline status is marked `'Failed'` (progress = 0%).
2. **Analysis-Only Execution (No Git Diff):**
   - Coordinator, Requirement, and Impact stages complete with 100% fidelity.
   - Review and PR stages are marked `status: 'skipped'`.
   - `prDraft` is strictly set to `null` (no hallucinated code changes).
   - Overall pipeline status is marked `'Partial'` (progress = 70%), signaling successful analytical completion without code review.
3. **External Service Failures (ChromaDB / NVIDIA NIM):**
   - If Python ChromaDB service is unreachable or times out, Impact stage proceeds with empty chunks and records `retrievalSucceeded: false`.
   - If NVIDIA NIM returns 401, 429, or network error, Impact stage activates AST heuristic fallback, records `fallbackUsed: true`, and completes gracefully.
   - Downstream pipeline execution is **not interrupted** by upstream AI inference fallbacks.
4. **Secret Scrubbing:**
   - Any raw exceptions containing `nvapi-...`, `ghp_...`, or file paths like `C:\Users\...` are intercepted and sanitized before returning to clients.

---

## 5. Files Changed

| File Path | Description of Changes |
|---|---|
| [`codescope/backend/services/orchestratorService.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/backend/services/orchestratorService.js) | **New.** Core multi-agent orchestrator: state machine, dedup cache, sanitization, socket event emission, agent stage runners. |
| [`codescope/backend/controllers/agentController.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/backend/controllers/agentController.js) | Updated `handleImpactAnalysis` to delegate to orchestrator while preserving Task 4 fields; added `handleOrchestrate` and `handleGetExecutionStatus`. |
| [`codescope/backend/routes/apiRoutes.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/backend/routes/apiRoutes.js) | Registered `/api/orchestrate`, `/api/workflow/run`, and `/api/orchestrate/status/:executionId`. |
| [`codescope/backend/scripts/test_task5_orchestration.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/backend/scripts/test_task5_orchestration.js) | **New.** 72-assertion automated test suite covering all 10 evaluation criteria. |
| [`codescope/frontend/src/services/api.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/services/api.js) | Added `orchestratePipeline()`, `fetchExecutionStatus()`; updated `analyzeImpact()` to accept diffs. |
| [`codescope/frontend/src/context/AnalysisContext.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/context/AnalysisContext.jsx) | Wired real backend `workflow` and `stages` into React state; added `runFullPipeline()`; removed fake initial states. |
| [`codescope/frontend/src/components/AIStatus.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/components/AIStatus.jsx) | Added visual styles and indicator badges for `'Skipped'` stage state. |
| [`codescope/frontend/src/components/AgentCard.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/components/AgentCard.jsx) | Added styling, neutral icon (`—`), and status text for skipped agents. |
| [`codescope/frontend/src/components/IntelligenceCore.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/components/IntelligenceCore.jsx) | Added `'Skipped'` mapping and responsive stage status badges. |
| [`codescope/frontend/src/components/PipelineStatus.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/components/PipelineStatus.jsx) | Updated pipeline stage renderers to display genuine backend execution statuses. |
| [`codescope/frontend/src/components/WorkspaceHub.jsx`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/components/WorkspaceHub.jsx) | PR Generator UI displays real `analysisData?.prDraft` and honest skip reasons when diffs are absent. |
| [`codescope/frontend/src/agents/CoordinatorAgent.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/agents/CoordinatorAgent.js) | Populated client agent interface for coordinator validation. |
| [`codescope/frontend/src/agents/RequirementAgent.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/agents/RequirementAgent.js) | Populated client agent interface for requirement parsing. |
| [`codescope/frontend/src/agents/ImpactAgent.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/agents/ImpactAgent.js) | Populated client agent interface for semantic impact analysis. |
| [`codescope/frontend/src/agents/ReviewAgent.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/agents/ReviewAgent.js) | Populated client agent interface for pre-review diff analysis. |
| [`codescope/frontend/src/agents/PRAgent.js`](file:///c:/Users/Kethan%20Kumar%20Yanapu/OneDrive/Desktop/codescope/codescope/frontend/src/agents/PRAgent.js) | Populated client agent interface for PR draft generation. |

---

## 6. Test Execution & Observed Results

### 6.1 Task 5 Orchestration Suite (`test_task5_orchestration.js`)

**Execution Command:** `node scripts/test_task5_orchestration.js`  
**Result:** **72 Passed, 0 Failed (100% Pass Rate)**

```text
================================================================
CodeScope Task 5: Reliable Multi-Agent Orchestration Test Suite
================================================================

AREA 1: Successful Multi-Agent Execution
  ✔ PASS [Test 1] Generated unique executionId
  ✔ PASS [Test 2] ExecutionId follows EXEC- prefix format
  ✔ PASS [Test 3] Overall status is "Completed" (got: Completed)
  ✔ PASS [Test 4] Workflow progress reached 100% (got: 100%)
  ✔ PASS [Test 5] Coordinator stage completed
  ✔ PASS [Test 6] Requirement stage completed
  ✔ PASS [Test 7] Impact stage completed
  ✔ PASS [Test 8] Review stage completed
  ✔ PASS [Test 9] PR Generator stage completed
  ✔ PASS [Test 10] Measured total pipeline execution duration

AREA 2: Correct Output Handoff Between Dependent Agents
  ✔ PASS [Test 11] Coordinator validated and passed requirementId
  ✔ PASS [Test 12] Coordinator sanitized input text
  ✔ PASS [Test 13] Requirement categorized domain correctly (got: Security & Authentication)
  ✔ PASS [Test 14] Requirement extracted technical concepts
  ✔ PASS [Test 15] Requirement extracted acceptance checklist
  ✔ PASS [Test 16] Impact stage produced impactedFiles
  ✔ PASS [Test 17] Review stage cross-referenced diff against impacted components
  ✔ PASS [Test 18] Review stage recorded touched files
  ✔ PASS [Test 19] PR title contains upstream requirement ID
  ✔ PASS [Test 20] PR body includes requirement context
  ✔ PASS [Test 21] PR body synthesizes review findings

AREA 3: Task 4 Retrieval Evidence Preservation in Pipeline
  ✔ PASS [Test 22] Pipeline preserved retrievedChunks array
  ✔ PASS [Test 23] aiMetadata.retrievalAttempted preserved
  ✔ PASS [Test 24] Stats records impactedFilesCount
  ✔ PASS [Test 25] Preserved interactive dependency graph
  ✔ PASS [Test 26] Verified evidence chunks preserved (found: 3)
  ✔ PASS [Test 27] Verified chunk retains similarity score

AREA 4: Stage Failing Without Incorrectly Marking Workflow Complete
  ✔ PASS [Test 28] Overall status is "Failed" on invalid input (got: Failed)
  ✔ PASS [Test 29] Coordinator stage flagged status === "failed"
  ✔ PASS [Test 30] Coordinator provides understandable error message
  ✔ PASS [Test 31] Requirement stage safely skipped on coordinator failure
  ✔ PASS [Test 32] Impact stage safely skipped on coordinator failure
  ✔ PASS [Test 33] Review stage safely skipped on coordinator failure
  ✔ PASS [Test 34] PR stage safely skipped on coordinator failure
  ✔ PASS [Test 35] Workflow progress is 0% on validation failure

AREA 5: Dependent Stage Skipped When Prerequisite Data Missing
  ✔ PASS [Test 36] Status is "Partial" when diff is omitted (got: Partial)
  ✔ PASS [Test 37] Coordinator completed for no-diff run
  ✔ PASS [Test 38] Requirement completed for no-diff run
  ✔ PASS [Test 39] Impact completed for no-diff run
  ✔ PASS [Test 40] Review stage safely skipped when diff is missing
  ✔ PASS [Test 41] Review stage provides clear skip reason
  ✔ PASS [Test 42] PR Generator safely skipped when diff is missing
  ✔ PASS [Test 43] PR stage provides clear skip reason

AREA 6: Downstream Service Failure Resilience & Honest Metadata
  ✔ PASS [Test 44] Impact stage gracefully succeeds via fallback
  ✔ PASS [Test 45] Impact fallback produces summaryMarkdown
  ✔ PASS [Test 46] Impact stage populates aiMetadata
  ✔ PASS [Test 47] aiMetadata honestly records fallbackUsed flag

AREA 7: Malformed Agent Outputs & Error Sanitization
  ✔ PASS [Test 48] Sanitizer stripped NVIDIA API key
  ✔ PASS [Test 49] Sanitizer injected [REDACTED_NVIDIA_KEY]
  ✔ PASS [Test 50] Sanitizer stripped absolute internal path
  ✔ PASS [Test 51] Coordinator rejects overly short input
  ✔ PASS [Test 52] Coordinator returns informative safe message

AREA 8: Prevention of PR Generation When Required Inputs Missing
  ✔ PASS [Test 53] PR generation is skipped when diff is empty
  ✔ PASS [Test 54] prDraft is null when diff is missing (no hallucinated PR)
  ✔ PASS [Test 55] Skip reason explains why PR generation was withheld
  ✔ PASS [Test 56] PR generation is skipped when upstream review output is missing

AREA 9: Existing API & Frontend Response Compatibility
  ✔ PASS [Test 57] handleImpactAnalysis responds with HTTP 200
  ✔ PASS [Test 58] Contract: summaryMarkdown is present string
  ✔ PASS [Test 59] Contract: primer is present string
  ✔ PASS [Test 60] Contract: impactedFiles is present array
  ✔ PASS [Test 61] Contract: retrievedChunks is present array
  ✔ PASS [Test 62] Contract: stats is present object
  ✔ PASS [Test 63] Contract: graph is present object
  ✔ PASS [Test 64] Contract: aiMetadata is present object
  ✔ PASS [Test 65] Contract Task 5: executionId is present
  ✔ PASS [Test 66] Contract Task 5: stages is present
  ✔ PASS [Test 67] Contract Task 5: workflow is present

AREA 10: Duplicate-Run Behavior & Status Lookup
  ✔ PASS [Test 68] Duplicate submission returned existing executionId
  ✔ PASS [Test 69] Duplicate submission returned completed status
  ✔ PASS [Test 70] getExecutionStatus successfully retrieved run by executionId
  ✔ PASS [Test 71] Retrieved record matches requested executionId
  ✔ PASS [Test 72] getExecutionStatus returns null for nonexistent ID

================================================================
TASK 5 TEST SUMMARY: 72 Passed, 0 Failed (Total: 72)
================================================================
```

### 6.2 Regression Suites

1. **Task 4 Retrieval Integration (`test_task4_retrieval_integration.js`):**
   - **63 Passed, 0 Failed (100% Pass Rate)**
   - Confirms Task 4 prompt enrichment, top-5 context clamping, chunk metadata propagation, NVIDIA NIM fallback recording, and verified evidence markers remain fully intact.
2. **Semantic Impact Analysis Suite (`test_semantic_impact.js`):**
   - **36 Passed, 0 Failed (100% Pass Rate)**
3. **Repository Indexing Suite (`test_repo_indexing.js`):**
   - **23 Passed, 0 Failed (100% Pass Rate)**

---

## 7. Remaining Limitations

1. **In-Memory Orchestration State:** Execution states and deduplication caches currently reside in Node.js process memory. In a distributed multi-node cluster, this state store should be backed by Redis or PostgreSQL to enable cross-worker status queries.
2. **Synchronous Execution Model:** Pipeline runs synchronously await all active stages (typically ~15–25 seconds when calling live NVIDIA NIM inference). For extremely large repositories or heavy git diffs exceeding 5,000 lines, background job queues (e.g. BullMQ / Celery) with client webhook callbacks would further optimize throughput.

---

## 8. Manual Verification Steps

To manually verify multi-agent orchestration end-to-end:

1. **Ensure Python Backend is Running:**
   ```bash
   conda activate base
   cd codescope/backend/python_service
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
2. **Start Node.js Backend:**
   ```bash
   cd codescope/backend
   npm run dev
   ```
3. **Run Full Orchestration via cURL (with Diff):**
   ```bash
   curl -X POST http://localhost:5000/api/orchestrate \
     -H "Content-Type: application/json" \
     -d '{
       "requirementId": "JIRA-777",
       "repoId": "repo-1",
       "brdText": "Implement OAuth2 Token Revocation and JWT session rotation in auth middleware.",
       "rawGitDiff": "diff --git a/backend/routes/authRoutes.js b/backend/routes/authRoutes.js\n--- a/backend/routes/authRoutes.js\n+++ b/backend/routes/authRoutes.js\n@@ -10,3 +10,4 @@\n+router.post(\"/revoke\", revokeToken);"
     }'
   ```
   **Expected Response:** `status: "Completed"`, all 5 stages `completed`, valid `prDraft` generated.

4. **Run Analysis-Only Orchestration via cURL (without Diff):**
   ```bash
   curl -X POST http://localhost:5000/api/impact-analysis \
     -H "Content-Type: application/json" \
     -d '{
       "requirementId": "JIRA-888",
       "repoId": "repo-1",
       "brdText": "Refactor database connection pool timeout to prevent connection starvation under load."
     }'
   ```
   **Expected Response:** `status: "Partial"`, Coordinator, Requirement, and Impact `completed`; Review and PR `skipped`; `prDraft: null`.

5. **Verify Duplicate Submission:**
   Send the exact same request within 5 minutes and observe immediate (<10ms) response returning identical `executionId`.
