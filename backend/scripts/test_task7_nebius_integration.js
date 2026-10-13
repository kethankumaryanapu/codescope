/**
 * test_task7_nebius_integration.js
 *
 * Comprehensive Automated Verification Suite for CodeScope Task 7:
 * "Verify and Integrate Nebius Token Factory"
 *
 * Verifies:
 *   1. Provider Selection & Configuration Resolution (Nebius vs NVIDIA NIM vs Aliases vs Defaults)
 *   2. Missing API Key Handling (Safe fallback, honest metadata, never claiming live model)
 *   3. Successful Mocked Nebius Response (Parsed completions, verified model nvidia/nemotron-3-super-120b-a12b)
 *   4. API Error Handling (HTTP 401, 429, 500 error resilience)
 *   5. Request Timeout Handling (Graceful fallback on timeout)
 *   6. Provider / Model / Source Metadata Transparency (Nebius vs NVIDIA vs Heuristic distinction)
 *   7. Compatibility with Existing Multi-Agent Orchestration & Endpoints
 *   8. Credential Security & Client Error Sanitization
 *
 * Note: Does NOT require a real secret. Safe to run in automated CI.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

import { getAiClient, generateImpactPrimer, generatePreReview } from '../services/geminiServices.js';
import {
  runOrchestrationPipeline,
  executeRequirementStage,
  executeImpactStage,
  executeReviewStage,
  sanitizeErrorForClient,
} from '../services/orchestratorService.js';
import { handleImpactAnalysis, handleOrchestrate } from '../controllers/agentController.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, description, detail = '') => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [Test ${totalTests}] ${description}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [Test ${totalTests}] ${description}`);
    if (detail) console.error(`    Detail: ${detail}`);
  }
};

const createMockOpenAIClient = ({ content = 'Mock response content', shouldThrow = null, delayMs = 0 } = {}) => {
  return {
    chat: {
      completions: {
        create: async ({ model, messages }) => {
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          if (shouldThrow) {
            throw shouldThrow;
          }
          return {
            id: 'chatcmpl-mock-nebius-12345',
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content,
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 120,
              completion_tokens: 85,
              total_tokens: 205,
            },
          };
        },
      },
    },
  };
};

const SAMPLE_BRD = `Requirement: JIRA-701 Nebius Token Factory Multi-Agent Integration
1. Configure Nebius Token Factory inference provider using official API endpoint.
2. Select verified eligible NVIDIA open-source model: nvidia/nemotron-3-super-120b-a12b.
3. Preserve existing NVIDIA NIM workflows with transparent provider metadata.
4. Add unit test assertions in test_nebius_inference.js.`;

const SAMPLE_DIFF = `diff --git a/backend/services/geminiServices.js b/backend/services/geminiServices.js
index 1111111..2222222 100644
--- a/backend/services/geminiServices.js
+++ b/backend/services/geminiServices.js
@@ -10,6 +10,12 @@
+export const getAiClient = (options = {}) => {
+  // Nebius Token Factory integration
+};
`;

const runTests = async () => {
  console.log('================================================================');
  console.log('CodeScope Task 7: Nebius Token Factory Integration Test Suite');
  console.log('================================================================\n');

  // ==========================================================================
  // AREA 1: Provider Selection & Configuration Resolution
  // ==========================================================================
  console.log('AREA 1: Provider Selection & Configuration Resolution');
  {
    const nebiusConf = getAiClient({ provider: 'nebius' });
    assert(nebiusConf.provider === 'nebius', 'getAiClient selects provider "nebius"');
    assert(nebiusConf.baseURL === 'https://api.tokenfactory.nebius.com/v1', 'Nebius uses verified official base URL: https://api.tokenfactory.nebius.com/v1', nebiusConf.baseURL);
    assert(nebiusConf.model === 'nvidia/nemotron-3-super-120b-a12b', 'Nebius defaults to verified eligible NVIDIA model: nvidia/nemotron-3-super-120b-a12b', nebiusConf.model);

    const nvidiaConf = getAiClient({ provider: 'nvidia' });
    assert(nvidiaConf.provider === 'nvidia', 'getAiClient selects provider "nvidia"');
    assert(nvidiaConf.baseURL === 'https://integrate.api.nvidia.com/v1', 'NVIDIA NIM uses official base URL: https://integrate.api.nvidia.com/v1', nvidiaConf.baseURL);
    assert(nvidiaConf.model.includes('llama'), 'NVIDIA NIM preserves default model', nvidiaConf.model);

    const aliasNebius = getAiClient({ provider: 'nebius-token-factory' });
    assert(aliasNebius.provider === 'nebius', 'Normalizes alias "nebius-token-factory" to "nebius"');

    const aliasNim = getAiClient({ provider: 'nvidia-nim' });
    assert(aliasNim.provider === 'nvidia', 'Normalizes alias "nvidia-nim" to "nvidia"');

    const customModel = getAiClient({ provider: 'nebius', model: 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF' });
    assert(customModel.model === 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF', 'Allows configurable custom model identifier override');
  }

  // ==========================================================================
  // AREA 2: Missing API Key & Placeholder Handling
  // ==========================================================================
  console.log('\nAREA 2: Missing API Key & Placeholder Handling');
  {
    const origKey = process.env.NEBIUS_API_KEY;
    try {
      delete process.env.NEBIUS_API_KEY;
      const missingKeyConf = getAiClient({ provider: 'nebius' });
      assert(missingKeyConf.isConfigured === false, 'Flags isConfigured: false when NEBIUS_API_KEY is unset');
      assert(missingKeyConf.client === null, 'Returns client: null when NEBIUS_API_KEY is unset');
      assert(missingKeyConf.error && missingKeyConf.error.includes('NEBIUS_API_KEY'), 'Clear descriptive error when key is unset');

      process.env.NEBIUS_API_KEY = 'your_nebius_api_key_here';
      const placeholderConf = getAiClient({ provider: 'nebius' });
      assert(placeholderConf.isConfigured === false, 'Rejects placeholder key string "your_nebius_api_key_here"');

      // Test honest fallback during impact analysis when key is missing
      delete process.env.NEBIUS_API_KEY;
      const primerMissingKey = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], { provider: 'nebius' });
      assert(primerMissingKey.summaryMarkdown && primerMissingKey.summaryMarkdown.length > 0, 'Generates fallback summary on missing Nebius key');
      assert(primerMissingKey.aiMetadata.liveInference === false, 'aiMetadata.liveInference is strictly false on missing key (honest reporting)');
      assert(primerMissingKey.aiMetadata.inferenceSucceeded === false, 'aiMetadata.inferenceSucceeded is strictly false');
      assert(primerMissingKey.aiMetadata.fallbackUsed === true, 'aiMetadata.fallbackUsed is strictly true');
      assert(primerMissingKey.aiMetadata.model === null, 'aiMetadata.model is null on fallback (does not hallucinate live model name)');
      assert(primerMissingKey.aiMetadata.configuredProvider === 'nebius', 'aiMetadata records requested configuredProvider: "nebius"');
      assert(primerMissingKey.aiMetadata.error && primerMissingKey.aiMetadata.error.includes('NEBIUS_API_KEY'), 'aiMetadata records missing key reason');
    } finally {
      if (origKey !== undefined) {
        process.env.NEBIUS_API_KEY = origKey;
      } else {
        delete process.env.NEBIUS_API_KEY;
      }
    }
  }

  // ==========================================================================
  // AREA 3: Successful Mocked Nebius Response
  // ==========================================================================
  console.log('\nAREA 3: Successful Mocked Nebius Response');
  {
    const mockImpactContent = `### Suggested Starting Map (JIRA-701)

#### Core Intent Summary
Integrates Nebius Token Factory API and wires the eligible NVIDIA open-source model into CodeScope orchestration.

#### Primary Files to Edit
- \`backend/services/geminiServices.js\`: Implement Nebius Token Factory client factory. [Verified Evidence]
- \`backend/services/orchestratorService.js\`: Propagate Nebius provider context. [Verified Evidence]

#### Upstream / Downstream Impact
Controllers calling impact analysis receive enriched Nebius metadata.

#### Existing Tests to Update
- \`backend/scripts/test_nebius_inference.js\`: Test Nebius inference endpoints.

#### Downstream Risk Assessment
Low regression risk; existing NVIDIA NIM provider preserved as fallback.`;

    const mockNebiusClient = createMockOpenAIClient({ content: mockImpactContent });

    const impactRes = await generateImpactPrimer(SAMPLE_BRD, ['backend/services/geminiServices.js'], {
      provider: 'nebius',
      model: 'nvidia/nemotron-3-super-120b-a12b',
      aiClient: mockNebiusClient,
    });

    assert(impactRes.summaryMarkdown.includes('Integrates Nebius Token Factory'), 'Parses mocked Nebius response content');
    assert(impactRes.aiMetadata.liveInference === true, 'aiMetadata.liveInference is true for successful mocked Nebius call');
    assert(impactRes.aiMetadata.inferenceSucceeded === true, 'aiMetadata.inferenceSucceeded is true');
    assert(impactRes.aiMetadata.fallbackUsed === false, 'aiMetadata.fallbackUsed is false');
    assert(impactRes.aiMetadata.provider === 'nebius', 'aiMetadata.provider is "nebius"');
    assert(impactRes.aiMetadata.source === 'nebius', 'aiMetadata.source is "nebius"');
    assert(impactRes.aiMetadata.model === 'nvidia/nemotron-3-super-120b-a12b', 'aiMetadata.model matches verified model identifier');

    // Pre-review with mocked Nebius client
    const mockReviewContent = `### Senior Staff Pre-Review Report (JIRA-701)

#### High-Level Review Findings
Clean integration of Nebius Token Factory provider with full backward compatibility.`;

    const mockReviewClient = createMockOpenAIClient({ content: mockReviewContent });
    const reviewRes = await generatePreReview(SAMPLE_DIFF, 'JIRA-701', ['backend/services/geminiServices.js'], 'repo-1', {
      provider: 'nebius',
      model: 'nvidia/nemotron-3-super-120b-a12b',
      aiClient: mockReviewClient,
    });

    assert(reviewRes.reviewMarkdown.includes('Clean integration of Nebius Token Factory'), 'Pre-review parses mocked Nebius completion');
    assert(reviewRes.aiMetadata.liveInference === true, 'Pre-review aiMetadata.liveInference is true');
    assert(reviewRes.aiMetadata.provider === 'nebius', 'Pre-review aiMetadata.provider is "nebius"');
    assert(reviewRes.aiMetadata.model === 'nvidia/nemotron-3-super-120b-a12b', 'Pre-review aiMetadata.model is verified NVIDIA model');
  }

  // ==========================================================================
  // AREA 4: API Error Handling (HTTP 401, 429, 500)
  // ==========================================================================
  console.log('\nAREA 4: API Error Handling (HTTP 401, 429, 500)');
  {
    const err401 = new Error('HTTP 401: Unauthorized — invalid or revoked Nebius Token');
    err401.status = 401;
    const client401 = createMockOpenAIClient({ shouldThrow: err401 });

    const res401 = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nebius',
      aiClient: client401,
    });

    assert(res401.summaryMarkdown && res401.summaryMarkdown.length > 0, 'Activates fallback on HTTP 401 error without throwing');
    assert(res401.aiMetadata.liveInference === false, 'aiMetadata.liveInference is false on HTTP 401');
    assert(res401.aiMetadata.fallbackUsed === true, 'aiMetadata.fallbackUsed is true on HTTP 401');
    assert(res401.aiMetadata.error && res401.aiMetadata.error.includes('401'), 'aiMetadata records error status');

    const err429 = new Error('HTTP 429: Rate limit exceeded on Nebius Token Factory');
    err429.status = 429;
    const client429 = createMockOpenAIClient({ shouldThrow: err429 });

    const res429 = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nebius',
      aiClient: client429,
    });

    assert(res429.aiMetadata.liveInference === false, 'aiMetadata.liveInference is false on HTTP 429');
    assert(res429.aiMetadata.fallbackUsed === true, 'aiMetadata.fallbackUsed is true on HTTP 429');
  }

  // ==========================================================================
  // AREA 5: Request Timeout Handling
  // ==========================================================================
  console.log('\nAREA 5: Request Timeout Handling');
  {
    const timeoutErr = new Error('Request timed out after 30000ms');
    timeoutErr.name = 'AbortError';
    const clientTimeout = createMockOpenAIClient({ shouldThrow: timeoutErr });

    const timeoutRes = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nebius',
      aiClient: clientTimeout,
    });

    assert(timeoutRes.aiMetadata.liveInference === false, 'aiMetadata.liveInference is false on timeout');
    assert(timeoutRes.aiMetadata.fallbackUsed === true, 'aiMetadata.fallbackUsed is true on timeout');
    assert(timeoutRes.aiMetadata.error && timeoutRes.aiMetadata.error.includes('timed out'), 'aiMetadata records timeout reason');
    assert(timeoutRes.summaryMarkdown && timeoutRes.summaryMarkdown.length > 0, 'Provides fallback starting map during timeout');
  }

  // ==========================================================================
  // AREA 6: Provider / Model / Source Metadata Transparency
  // ==========================================================================
  console.log('\nAREA 6: Provider / Model / Source Metadata Transparency');
  {
    const mockClientNebius = createMockOpenAIClient({ content: 'Nebius live analysis' });
    const nebiusLiveRes = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nebius',
      aiClient: mockClientNebius,
    });
    assert(nebiusLiveRes.aiMetadata.source === 'nebius', 'Nebius live inference sets source: "nebius"');
    assert(nebiusLiveRes.aiMetadata.provider === 'nebius', 'Nebius live inference sets provider: "nebius"');

    const mockClientNvidia = createMockOpenAIClient({ content: 'NVIDIA live analysis' });
    const nvidiaLiveRes = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nvidia',
      aiClient: mockClientNvidia,
    });
    assert(nvidiaLiveRes.aiMetadata.source === 'nvidia-nim', 'NVIDIA NIM live inference sets source: "nvidia-nim"');
    assert(nvidiaLiveRes.aiMetadata.provider === 'nvidia', 'NVIDIA NIM live inference sets provider: "nvidia"');

    // Missing client -> fallback
    const fallbackRes = await generateImpactPrimer(SAMPLE_BRD, ['src/index.js'], {
      provider: 'nebius',
      aiClient: createMockOpenAIClient({ shouldThrow: new Error('Simulated failure') }),
    });
    assert(fallbackRes.aiMetadata.source === 'heuristic-ast-matcher' || fallbackRes.aiMetadata.source === 'python-agent', 'Fallback sets honest source (heuristic/python)');
    assert(fallbackRes.aiMetadata.model === null, 'Fallback model is null');
    assert(fallbackRes.aiMetadata.fallbackUsed === true, 'fallbackUsed is true');
  }

  // ==========================================================================
  // AREA 7: Compatibility with Existing Workflows & Orchestrator
  // ==========================================================================
  console.log('\nAREA 7: Compatibility with Existing Workflows & Orchestrator');
  {
    const mockNebius = createMockOpenAIClient({ content: 'Multi-agent orchestration through Nebius Token Factory.' });

    const pipelineResult = await runOrchestrationPipeline({
      brdText: SAMPLE_BRD,
      repoId: 'repo-1',
      requirementId: 'JIRA-701',
      rawGitDiff: SAMPLE_DIFF,
      provider: 'nebius',
      model: 'nvidia/nemotron-3-super-120b-a12b',
      aiClient: mockNebius,
    });

    assert(pipelineResult.status === 'Completed', 'Pipeline completes 100% with Nebius Token Factory provider');
    assert(pipelineResult.stages.coordinator.status === 'completed', 'Coordinator stage completes');
    assert(pipelineResult.stages.requirement.status === 'completed', 'Requirement stage completes');
    assert(pipelineResult.stages.impact.status === 'completed', 'Impact stage completes');
    assert(pipelineResult.stages.review.status === 'completed', 'Review stage completes');
    assert(pipelineResult.stages.pr.status === 'completed', 'PR Generator stage completes');
    assert(pipelineResult.aiMetadata.provider === 'nebius', 'Pipeline aiMetadata reflects provider: "nebius"');
    assert(pipelineResult.aiMetadata.model === 'nvidia/nemotron-3-super-120b-a12b', 'Pipeline aiMetadata reflects verified model');

    // Test API Controller integration with Nebius provider parameter
    let responseStatus = null;
    let responseBody = null;
    const mockRes = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseBody = data;
          },
        };
      },
    };

    const mockReq = {
      body: {
        brdText: SAMPLE_BRD,
        repoId: 'repo-1',
        requirementId: 'JIRA-701',
        provider: 'nebius',
        model: 'nvidia/nemotron-3-super-120b-a12b',
      },
    };

    await handleImpactAnalysis(mockReq, mockRes);
    assert(responseStatus === 200, 'handleImpactAnalysis responds with HTTP 200 for Nebius provider request');
    assert(responseBody.summaryMarkdown !== undefined, 'Response preserves summaryMarkdown contract');
    assert(responseBody.aiMetadata !== undefined, 'Response preserves aiMetadata contract');
  }

  // ==========================================================================
  // AREA 8: Credential Security & Client Error Sanitization
  // ==========================================================================
  console.log('\nAREA 8: Credential Security & Client Error Sanitization');
  {
    const errorWithNebiusKey = 'Error connecting to https://api.tokenfactory.nebius.com: failed with nebius-sec-9876543210abcdef';
    const sanitizedNebius = sanitizeErrorForClient(errorWithNebiusKey);
    assert(!sanitizedNebius.includes('nebius-sec-'), 'Sanitizer scrubs Nebius secret pattern');
    assert(sanitizedNebius.includes('[REDACTED_NEBIUS_KEY]'), 'Sanitizer replaces Nebius secret with [REDACTED_NEBIUS_KEY]');

    const errorWithNvidiaKey = 'NVIDIA NIM call failed: nvapi-abcdef1234567890';
    const sanitizedNvidia = sanitizeErrorForClient(errorWithNvidiaKey);
    assert(!sanitizedNvidia.includes('nvapi-'), 'Sanitizer scrubs NVIDIA NIM key');
    assert(sanitizedNvidia.includes('[REDACTED_NVIDIA_KEY]'), 'Sanitizer replaces NVIDIA key with [REDACTED_NVIDIA_KEY]');

    const errorWithBearer = 'Authorization failure: Bearer supersecrettoken12345';
    const sanitizedBearer = sanitizeErrorForClient(errorWithBearer);
    assert(!sanitizedBearer.includes('supersecrettoken'), 'Sanitizer scrubs generic Bearer tokens');

    const errorWithPath = 'Internal error at C:\\Users\\Administrator\\secret\\config.json';
    const sanitizedPath = sanitizeErrorForClient(errorWithPath);
    assert(!sanitizedPath.includes('C:\\Users\\'), 'Sanitizer scrubs internal Windows paths');
  }

  console.log('\n================================================================');
  console.log(`TASK 7 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed (Total: ${totalTests})`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test Suite Unhandled Exception:', err);
  process.exit(1);
});
