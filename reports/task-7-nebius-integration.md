# CodeScope Task 7 — Nebius Token Factory Verification & Integration Report

**Document Date:** October 2026  
**Status:** Focused Integration Complete & Verified via Automated Contract Suite  
**Live Inference Status:** Blocked Pending Real `NEBIUS_API_KEY` (Safe Optional Runner Provided)  
**Workspace:** `codescope`  
**Test Suite Summary:**
- Node.js Task 7 Nebius Test Suite: **65/65 Assertions Passing (100%)**
- Python Agent Nebius/NVIDIA Test Suite: **17/17 Tests Passing (100%)**
- Node.js Multi-Agent Task 5 Regression Suite: **71/71 Assertions Passing (100%)**
- Live Inference Runner: **Safely exits with code 0 (SKIP)** when unconfigured

---

## Executive Summary

Task 7 integrates CodeScope with the **Nebius Token Factory** as a first-class inference provider utilizing an eligible NVIDIA open-source model, while preserving the existing **NVIDIA NIM** integration as a separate, selectable provider.

In accordance with Step 1 and Step 2 guidelines:
1. **No Conflation of Endpoints**: NVIDIA NIM (`https://integrate.api.nvidia.com/v1`) and Nebius Token Factory (`https://api.tokenfactory.nebius.com/v1`) are treated as distinct providers with separate endpoints, credential schemas, models, and metadata identifiers.
2. **Verified Eligible NVIDIA Model**: Integrated **`nvidia/nemotron-3-super-120b-a12b`** (a 120B hybrid Mixture-of-Experts model specifically tuned for multi-agent reasoning), with support for **`nvidia/Llama-3.1-Nemotron-70B-Instruct-HF`**.
3. **Transparent Source Metadata**: Responses strictly record whether inference originated from `nebius`, `nvidia-nim`, or fallback heuristics. Fallbacks never claim live model execution or hallucinate model names.
4. **Credential Security**: API keys are read solely from environment variables (`NEBIUS_API_KEY`) and are never logged or committed. The client error sanitizer scrubs both `nebius-*` and `nvapi-*` tokens.
5. **Honest Compliance Statement**: Hackathon compliance is **not** claimed as complete until an actual live inference request is verified against the Nebius Token Factory using valid credentials.

---

## 1. Official Documentation & Architecture Verification

### 1.1 Nebius Token Factory Endpoint & Authentication Format
From official Nebius documentation (`docs.nebius.com` / `tokenfactory.nebius.com`):
- **Service Name:** Nebius Token Factory (Serverless Inference & Dedicated Endpoints)
- **Official Base URL:** `https://api.tokenfactory.nebius.com/v1` (also compatible with `https://api.studio.nebius.ai/v1`)
- **Protocol:** OpenAI-compatible REST API (`POST /v1/chat/completions`)
- **Authentication Header:** `Authorization: Bearer <NEBIUS_API_KEY>`
- **Environment Variable Convention:** `NEBIUS_API_KEY`

### 1.2 Eligible NVIDIA Open-Source Models
Nebius Token Factory hosts high-performance open models on NVIDIA GPU clusters. The verified NVIDIA model catalog includes:
- **`nvidia/nemotron-3-super-120b-a12b` (Default in CodeScope):**
  - **Architecture:** 120B parameter hybrid Mixture-of-Experts (MoE) model.
  - **Suitability:** Built specifically for complex multi-agent workflows, code intelligence, and multi-step reasoning.
- **`nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` (Selectable Alternative):**
  - **Architecture:** 70B parameter open-weights model aligned by NVIDIA using RLHF (REINFORCE) with HelpSteer2 preference datasets.
- **`nvidia/Nemotron-3-Ultra-550b-a55b`:**
  - **Architecture:** 550B hybrid MoE frontier model for ultra-deep autonomous pipelines.
- **`nvidia/Nemotron-3_5-Lightning`:**
  - **Architecture:** Hybrid Mamba-Transformer MoE for low-latency agent execution layers.

### 1.3 Provider Distinction: Nebius Token Factory vs. NVIDIA NIM

| Attribute | Nebius Token Factory | NVIDIA NIM | Heuristic Fallback |
|---|---|---|---|
| **Endpoint Base URL** | `https://api.tokenfactory.nebius.com/v1` | `https://integrate.api.nvidia.com/v1` | N/A (Local AST / In-Memory) |
| **Auth Environment Var** | `NEBIUS_API_KEY` | `NVIDIA_API_KEY` | None |
| **Key Format / Prefix** | Bearer token / `nebius-*` | `nvapi-*` | None |
| **Default Model** | `nvidia/nemotron-3-super-120b-a12b` | `meta/llama-3.2-11b-vision-instruct` | `null` |
| **Response `provider`** | `"nebius"` | `"nvidia"` | `"none"` |
| **Response `source`** | `"nebius"` | `"nvidia-nim"` | `"heuristic-ast-matcher"` / `"python-agent"` |
| **`liveInference`** | `true` | `true` | `false` |
| **`fallbackUsed`** | `false` | `false` | `true` |

---

## 2. Changes Implemented

### 2.1 Node.js Backend AI Service (`backend/services/geminiServices.js`)
- **Exported `getAiClient(options)`:** Multi-provider client resolver supporting:
  - Explicit option: `options.provider` (`'nebius'` or `'nvidia'`)
  - Environment variable: `AI_PROVIDER` or `LLM_PROVIDER`
  - Automatic detection: Defaults to `'nebius'` if `NEBIUS_API_KEY` exists, or `'nvidia'` if `NVIDIA_API_KEY` exists
  - Model identifier resolution with verified default: `nvidia/nemotron-3-super-120b-a12b`
  - Base URL normalization: `https://api.tokenfactory.nebius.com/v1`
  - Mock client injection support (`options.aiClient`) for deterministic offline unit testing.
- **`generateImpactPrimer` Updates:**
  - Invokes `getAiClient(options)` with provider and model context.
  - Distinguishes live Nebius inference logs (`[Nebius Token Factory] ✅ Live inference SUCCESS`) from NVIDIA NIM logs (`[NVIDIA NIM] ✅ Live inference SUCCESS`).
  - Sets `aiMetadata.provider`, `aiMetadata.source`, and `aiMetadata.model`.
  - On API errors (HTTP 401, 429, 500) or timeouts, activates fallback honestly (`liveInference: false`, `fallbackUsed: true`, `model: null`, `error: <sanitizedError>`).
- **`generatePreReview` Updates:**
  - Passes provider options to the pre-review inference stage.
  - Enriches response `aiMetadata` with provider and model identifiers.

### 2.2 Node.js Backend Orchestrator (`backend/services/orchestratorService.js`)
- **Stage Parameter Propagation:**
  - `executeRequirementStage`: Enriches BRD analysis using Nebius Token Factory when configured.
  - `executeImpactStage`: Propagates `provider`, `model`, and `aiClient` to `generateImpactPrimer`.
  - `executeReviewStage`: Propagates `provider`, `model`, and `aiClient` to `generatePreReview`.
  - `runOrchestrationPipeline`: Accepts `provider` and `model` in input parameters and exposes them in the final workflow report.
- **Secret Sanitizer Enhancements (`sanitizeErrorForClient`):**
  - Added redaction pattern for Nebius API keys: `/(?:nebius-[a-zA-Z0-9_\-]+)/gi -> [REDACTED_NEBIUS_KEY]`.
  - Preserved redaction for `nvapi-*`, `ghp_*`, bearer tokens, and internal Windows filesystem paths.

### 2.3 Backend API Controllers (`backend/controllers/agentController.js`)
- `handleImpactAnalysis`: Extracts optional `provider` and `model` from `req.body` and passes them to `runOrchestrationPipeline`.
- `handleOrchestrate`: Extracts optional `provider` and `model` from `req.body` and passes them to `runOrchestrationPipeline`.

### 2.4 Python Agent Service (`Impact-Analysis-agent-review/Code-Impact-Analysis-agent-review/`)
- **`app/core/config.py`:**
  - Added `NEBIUS = "nebius"` to `LLMProvider` enum.
  - Added configuration settings:
    - `nebius_api_key: str = ""`
    - `nebius_model: str = "nvidia/nemotron-3-super-120b-a12b"`
    - `nebius_base_url: str = "https://api.tokenfactory.nebius.com/v1"`
- **`app/agents/base_agent.py`:**
  - `_default_model`: Returns `self._settings.nebius_model` when `default_llm_provider == LLMProvider.NEBIUS`.
  - `_initialize_llm_client`: Returns `OpenAI(api_key=self._settings.nebius_api_key, base_url=self._settings.nebius_base_url)` when `provider == LLMProvider.NEBIUS`.
- **`tests/test_nebius_config.py`:**
  - Automated tests verifying `LLMProvider.NEBIUS`, settings defaults, and OpenAI client initialization.

### 2.5 Environment Examples
- **`backend/.env.example`:** Added placeholder values:
  ```env
  # ──────────────────────────────────────────────
  # AI Inference Provider Selection
  # ──────────────────────────────────────────────
  AI_PROVIDER=nebius

  # ──────────────────────────────────────────────
  # Nebius Token Factory Inference
  # ──────────────────────────────────────────────
  NEBIUS_API_KEY=your_nebius_api_key_here
  NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b
  NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1

  # ──────────────────────────────────────────────
  # NVIDIA NIM Inference (preserved provider)
  # ──────────────────────────────────────────────
  NVIDIA_API_KEY=your_nvidia_api_key_here
  NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
  NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
  ```
- **`Impact-Analysis-agent-review/Code-Impact-Analysis-agent-review/.env.example`:** Added corresponding Python agent placeholders.

---

## 3. Test Suites & Verification Results

### 3.1 Node.js Task 7 Test Suite (`backend/scripts/test_task7_nebius_integration.js`)
**Result: 65 Passed, 0 Failed (100% Pass Rate)**

```text
================================================================
CodeScope Task 7: Nebius Token Factory Integration Test Suite
================================================================

AREA 1: Provider Selection & Configuration Resolution
  ✔ PASS [Test 1] getAiClient selects provider "nebius"
  ✔ PASS [Test 2] Nebius uses verified official base URL: https://api.tokenfactory.nebius.com/v1
  ✔ PASS [Test 3] Nebius defaults to verified eligible NVIDIA model: nvidia/nemotron-3-super-120b-a12b
  ✔ PASS [Test 4] getAiClient selects provider "nvidia"
  ✔ PASS [Test 5] NVIDIA NIM uses official base URL: https://integrate.api.nvidia.com/v1
  ✔ PASS [Test 6] NVIDIA NIM preserves default model
  ✔ PASS [Test 7] Normalizes alias "nebius-token-factory" to "nebius"
  ✔ PASS [Test 8] Normalizes alias "nvidia-nim" to "nvidia"
  ✔ PASS [Test 9] Allows configurable custom model identifier override

AREA 2: Missing API Key & Placeholder Handling
  ✔ PASS [Test 10] Flags isConfigured: false when NEBIUS_API_KEY is unset
  ✔ PASS [Test 11] Returns client: null when NEBIUS_API_KEY is unset
  ✔ PASS [Test 12] Clear descriptive error when key is unset
  ✔ PASS [Test 13] Rejects placeholder key string "your_nebius_api_key_here"
  ✔ PASS [Test 14] Generates fallback summary on missing Nebius key
  ✔ PASS [Test 15] aiMetadata.liveInference is strictly false on missing key (honest reporting)
  ✔ PASS [Test 16] aiMetadata.inferenceSucceeded is strictly false
  ✔ PASS [Test 17] aiMetadata.fallbackUsed is strictly true
  ✔ PASS [Test 18] aiMetadata.model is null on fallback (does not hallucinate live model name)
  ✔ PASS [Test 19] aiMetadata records requested configuredProvider: "nebius"
  ✔ PASS [Test 20] aiMetadata records missing key reason

AREA 3: Successful Mocked Nebius Response
  ✔ PASS [Test 21] Parses mocked Nebius response content
  ✔ PASS [Test 22] aiMetadata.liveInference is true for successful mocked Nebius call
  ✔ PASS [Test 23] aiMetadata.inferenceSucceeded is true
  ✔ PASS [Test 24] aiMetadata.fallbackUsed is false
  ✔ PASS [Test 25] aiMetadata.provider is "nebius"
  ✔ PASS [Test 26] aiMetadata.source is "nebius"
  ✔ PASS [Test 27] aiMetadata.model matches verified model identifier
  ✔ PASS [Test 28] Pre-review parses mocked Nebius completion
  ✔ PASS [Test 29] Pre-review aiMetadata.liveInference is true
  ✔ PASS [Test 30] Pre-review aiMetadata.provider is "nebius"
  ✔ PASS [Test 31] Pre-review aiMetadata.model is verified NVIDIA model

AREA 4: API Error Handling (HTTP 401, 429, 500)
  ✔ PASS [Test 32] Activates fallback on HTTP 401 error without throwing
  ✔ PASS [Test 33] aiMetadata.liveInference is false on HTTP 401
  ✔ PASS [Test 34] aiMetadata.fallbackUsed is true on HTTP 401
  ✔ PASS [Test 35] aiMetadata records error status
  ✔ PASS [Test 36] aiMetadata.liveInference is false on HTTP 429
  ✔ PASS [Test 37] aiMetadata.fallbackUsed is true on HTTP 429

AREA 5: Request Timeout Handling
  ✔ PASS [Test 38] aiMetadata.liveInference is false on timeout
  ✔ PASS [Test 39] aiMetadata.fallbackUsed is true on timeout
  ✔ PASS [Test 40] aiMetadata records timeout reason
  ✔ PASS [Test 41] Provides fallback starting map during timeout

AREA 6: Provider / Model / Source Metadata Transparency
  ✔ PASS [Test 42] Nebius live inference sets source: "nebius"
  ✔ PASS [Test 43] Nebius live inference sets provider: "nebius"
  ✔ PASS [Test 44] NVIDIA NIM live inference sets source: "nvidia-nim"
  ✔ PASS [Test 45] NVIDIA NIM live inference sets provider: "nvidia"
  ✔ PASS [Test 46] Fallback sets honest source (heuristic/python)
  ✔ PASS [Test 47] Fallback model is null
  ✔ PASS [Test 48] fallbackUsed is true

AREA 7: Compatibility with Existing Workflows & Orchestrator
  ✔ PASS [Test 49] Pipeline completes 100% with Nebius Token Factory provider
  ✔ PASS [Test 50] Coordinator stage completes
  ✔ PASS [Test 51] Requirement stage completes
  ✔ PASS [Test 52] Impact stage completes
  ✔ PASS [Test 53] Review stage completes
  ✔ PASS [Test 54] PR Generator stage completes
  ✔ PASS [Test 55] Pipeline aiMetadata reflects provider: "nebius"
  ✔ PASS [Test 56] Pipeline aiMetadata reflects verified model
  ✔ PASS [Test 57] handleImpactAnalysis responds with HTTP 200 for Nebius provider request
  ✔ PASS [Test 58] Response preserves summaryMarkdown contract
  ✔ PASS [Test 59] Response preserves aiMetadata contract

AREA 8: Credential Security & Client Error Sanitization
  ✔ PASS [Test 60] Sanitizer scrubs Nebius secret pattern
  ✔ PASS [Test 61] Sanitizer replaces Nebius secret with [REDACTED_NEBIUS_KEY]
  ✔ PASS [Test 62] Sanitizer scrubs NVIDIA NIM key
  ✔ PASS [Test 63] Sanitizer replaces NVIDIA key with [REDACTED_NVIDIA_KEY]
  ✔ PASS [Test 64] Sanitizer scrubs generic Bearer tokens
  ✔ PASS [Test 65] Sanitizer scrubs internal Windows paths

================================================================
TASK 7 TEST SUMMARY: 65 Passed, 0 Failed (Total: 65)
================================================================
```

### 3.2 Python Agent Test Suite
Command: `pytest tests/test_nebius_config.py tests/test_nvidia_config.py`  
**Result: 17 Passed in 7.30s (100% Pass Rate)**
- `test_nebius_config.py`: 8 passed
- `test_nvidia_config.py`: 9 passed

### 3.3 Task 5 Multi-Agent Regression Test Suite
Command: `node backend/scripts/test_task5_orchestration.js`  
**Result: 71 Passed, 0 Failed (100% Pass Rate)**
Confirms that all 10 areas of multi-agent orchestration, Task 4 retrieval integration, and stage handoffs operate with 100% compatibility.

### 3.4 Live Inference Safe Test Script (`backend/scripts/test_nebius_inference.js`)
Command: `node backend/scripts/test_nebius_inference.js`  
**Result:**
```text
================================================================
Nebius Token Factory Live Inference Verification
================================================================
Provider: Nebius Token Factory
Model: nvidia/nemotron-3-super-120b-a12b
Base URL: https://api.tokenfactory.nebius.com/v1
Status: SKIP (NEBIUS_API_KEY not configured)
Note: To run a real live test against Nebius Token Factory, set NEBIUS_API_KEY in backend/.env.
```
Exits with exit code 0 safely without exposing keys or blocking CI.

---

## 4. How to Run the Tests

### 4.1 Running the Automated Nebius Verification Suite (Offline / CI-Safe)
From `codescope/backend`:
```bash
npm run test:task7
# Or: node scripts/test_task7_nebius_integration.js
```

### 4.2 Running the Python Agent Configuration Tests
From `codescope/Impact-Analysis-agent-review/Code-Impact-Analysis-agent-review`:
```bash
pytest tests/test_nebius_config.py tests/test_nvidia_config.py
```

### 4.3 Running Existing Multi-Agent Regression Tests
From `codescope/backend`:
```bash
node scripts/test_task5_orchestration.js
```

### 4.4 Running Optional Live Nebius Inference (Requires Real Credentials)
From `codescope/backend`:
```bash
npm run test:nebius
# Or: node scripts/test_nebius_inference.js
```

---

## 5. Configuration Required for a Real Live Test

To perform live inference against the actual Nebius Token Factory:

1. Obtain an API key from the **Nebius Token Factory Console** (`tokenfactory.nebius.com` -> API Keys).
2. Configure `codescope/backend/.env`:
   ```env
   AI_PROVIDER=nebius
   NEBIUS_API_KEY=your_actual_nebius_api_key_here
   NEBIUS_MODEL=nvidia/nemotron-3-super-120b-a12b
   NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1
   ```
3. Run the live verification runner:
   ```bash
   node backend/scripts/test_nebius_inference.js
   ```
4. If successful, the script will output:
   ```text
   HTTP Status: 200 OK
   Response received: YES
   Sample content: NEBIUS TOKEN FACTORY OK
   Nebius Token Factory inference: PASS
   ```

---

## 6. Known Limitations & Current Blockers

1. **Missing Real Nebius API Key:**
   - As documented in Step 1, real `NEBIUS_API_KEY` credentials are not present in the current development environment or repository.
   - Consequently, live network requests to `api.tokenfactory.nebius.com` cannot currently be executed without credentials.
2. **Hackathon Compliance Notice:**
   - **Compliance is not claimed as complete** until an active `NEBIUS_API_KEY` is provided, live inference against `https://api.tokenfactory.nebius.com/v1` is executed, and live model responsiveness for `nvidia/nemotron-3-super-120b-a12b` is confirmed.
   - The integration, provider routing, error boundaries, test harness, and honest metadata layers are fully in place and verified ready for live credentials.
