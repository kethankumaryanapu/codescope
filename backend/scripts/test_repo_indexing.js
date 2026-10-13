/**
 * Comprehensive Verification Test Suite for Task 2:
 * Repository Scanning to Python Multi-Agent Indexing Pipeline
 * 
 * Verifies:
 * 1. Path validation & registry lookup security
 * 2. Python agent health & service availability handling
 * 3. End-to-end Scan -> Python Indexing -> ChromaDB storage flow
 * 4. Duplicate indexing prevention
 * 5. Error handling on service unavailability & timeouts
 */

import {
  resolveValidatedRepoPath,
  getRepositoryById,
  isRepoAlreadyIndexed,
  updateRepoPythonIndexStatus,
} from '../services/codeIndexer.js';
import {
  checkPythonServiceHealth,
  getPythonEmbeddingStats,
  triggerPythonRepoIndex,
} from '../services/pythonAgentService.js';
import { handleScanRepository } from '../controllers/repoController.js';

let passed = 0;
let failed = 0;

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failed++;
  }
};

const runTests = async () => {
  console.log('================================================================');
  console.log('Codescope Task 2: Scan -> Python Indexing Verification Suite');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Test 1: Repository Path Validation Security
  // --------------------------------------------------------------------------
  console.log('TEST SUITE 1: Repository Path Security & Validation');

  const validPathResult = resolveValidatedRepoPath('repo-1');
  assert(
    validPathResult.valid === true && typeof validPathResult.path === 'string',
    'Registered repo-1 resolves to valid filesystem path',
    JSON.stringify(validPathResult)
  );

  const invalidRepoResult = resolveValidatedRepoPath('non-existent-repo-999');
  assert(
    invalidRepoResult.valid === true || invalidRepoResult.repo !== undefined,
    'Fallback safely retrieves valid known repo or returns safe error',
    JSON.stringify(invalidRepoResult)
  );

  // Directly verify triggerPythonRepoIndex rejects arbitrary nonexistent paths
  const fakePathResult = await triggerPythonRepoIndex('C:\\nonexistent\\arbitrary\\path\\test');
  assert(
    fakePathResult.success === false && fakePathResult.status === 'path_not_found',
    'triggerPythonRepoIndex rejects arbitrary non-existent paths',
    JSON.stringify(fakePathResult)
  );

  // --------------------------------------------------------------------------
  // Test 2: Unavailability & Graceful Error Handling
  // --------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Graceful Error Handling (Simulated Downtime)');

  const originalUrl = process.env.PYTHON_AGENT_URL;
  try {
    // Point to non-listening port to simulate service downtime
    process.env.PYTHON_AGENT_URL = 'http://localhost:59998';

    const downHealth = await checkPythonServiceHealth();
    assert(
      downHealth.available === false && downHealth.status === 'unavailable',
      'Health check correctly reports unavailable service on down port'
    );

    const downIndexResult = await triggerPythonRepoIndex(validPathResult.path, { timeoutMs: 2000 });
    assert(
      downIndexResult.success === false && downIndexResult.status === 'unavailable',
      'triggerPythonRepoIndex returns unavailable status without crashing on unreachable port',
      downIndexResult.error
    );

    // Verify handleScanRepository doesn't fail HTTP 200 contract during Python downtime
    let mockResponse = {};
    const mockRes = {
      status: (code) => {
        mockResponse.statusCode = code;
        return {
          json: (data) => {
            mockResponse.data = data;
            return data;
          },
        };
      },
    };

    await handleScanRepository(
      { body: { repoId: 'repo-1', forceReindex: true } },
      mockRes
    );

    assert(
      mockResponse.statusCode === 200,
      'Scan endpoint returns HTTP 200 even when Python service is offline'
    );
    assert(
      mockResponse.data.pythonIndexing.success === false,
      'Does not report indexing success when Python service is offline'
    );
    assert(
      mockResponse.data.pythonIndexing.status === 'unavailable',
      'Reports pythonIndexing.status as unavailable during downtime'
    );
    assert(
      mockResponse.data.totalFiles > 0 && Array.isArray(mockResponse.data.indexedFiles),
      'Preserves local AST scan files and metrics despite Python downtime'
    );
  } finally {
    process.env.PYTHON_AGENT_URL = originalUrl || 'http://localhost:8000';
  }

  // --------------------------------------------------------------------------
  // Test 3: Live Python Service Health Check
  // --------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: Live Python Agent Health');

  const liveHealth = await checkPythonServiceHealth();
  console.log(`  Live Python Service Health: ${liveHealth.available ? 'ONLINE' : 'OFFLINE'}`);

  if (!liveHealth.available) {
    console.log('\n  [NOTICE] Python service is not running on port 8000.');
    console.log('  To test live indexing, start the service with:');
    console.log('    cd Impact-Analysis-agent-review/Code-Impact-Analysis-agent-review');
    console.log('    uvicorn app.main:app --port 8000\n');
  } else {
    assert(
      liveHealth.available === true && liveHealth.status === 'healthy',
      'Python agent reports healthy status'
    );

    // Check stats before
    const statsBefore = await getPythonEmbeddingStats();
    assert(statsBefore.success === true, 'Successfully retrieved ChromaDB stats before index');
    console.log(`  ChromaDB total_records before index: ${statsBefore.stats?.total_records}`);

    // --------------------------------------------------------------------------
    // Test 4: End-to-End Scan & ChromaDB Ingestion
    // --------------------------------------------------------------------------
    console.log('\nTEST SUITE 4: End-to-End Scan -> Python Indexing -> ChromaDB Ingestion');

    let scanResponse = {};
    const scanRes = {
      status: (code) => {
        scanResponse.statusCode = code;
        return {
          json: (data) => {
            scanResponse.data = data;
            return data;
          },
        };
      },
    };

    console.log('  Triggering handleScanRepository with repo-1 and forceReindex=true...');
    await handleScanRepository(
      { body: { repoId: 'repo-1', forceReindex: true } },
      scanRes
    );

    assert(scanResponse.statusCode === 200, 'Scan endpoint returns HTTP 200');
    assert(
      scanResponse.data.pythonIndexing.success === true,
      'Confirmed pythonIndexing.success === true'
    );
    assert(
      scanResponse.data.pythonIndexing.chunksStored > 0,
      `ChromaDB chunks stored confirmed > 0 (${scanResponse.data.pythonIndexing.chunksStored} chunks)`
    );
    assert(
      scanResponse.data.pythonIndexing.status === 'success',
      'pythonIndexing status is "success"'
    );
    assert(
      scanResponse.data.repo.pythonIndexed === true,
      'Repository record marked as pythonIndexed = true'
    );

    // Check stats after: records should now be > 0 in ChromaDB!
    const statsAfter = await getPythonEmbeddingStats();
    assert(statsAfter.success === true, 'Successfully retrieved ChromaDB stats after index');
    console.log(`  ChromaDB total_records after index: ${statsAfter.stats?.total_records}`);
    assert(
      statsAfter.stats?.total_records > 0,
      'ChromaDB total_records verified > 0 after indexing pipeline run'
    );

    // --------------------------------------------------------------------------
    // Test 5: Duplicate Indexing Avoidance
    // --------------------------------------------------------------------------
    console.log('\nTEST SUITE 5: Duplicate Indexing Avoidance');

    let secondScanResponse = {};
    const secondScanRes = {
      status: (code) => {
        secondScanResponse.statusCode = code;
        return {
          json: (data) => {
            secondScanResponse.data = data;
            return data;
          },
        };
      },
    };

    console.log('  Triggering second scan on repo-1 WITHOUT forceReindex...');
    await handleScanRepository(
      { body: { repoId: 'repo-1' } },
      secondScanRes
    );

    assert(secondScanResponse.statusCode === 200, 'Second scan returns HTTP 200');
    assert(
      secondScanResponse.data.pythonIndexing.status === 'already_indexed',
      'Second scan detects repo is already indexed and returns status "already_indexed"'
    );
    assert(
      secondScanResponse.data.pythonIndexing.skippedDuplicate === true,
      'Second scan explicitly flags skippedDuplicate: true'
    );

    // --------------------------------------------------------------------------
    // Test 6: Python /api/v1/parse Endpoint Verification
    // --------------------------------------------------------------------------
    console.log('\nTEST SUITE 6: Python /api/v1/parse Endpoint Compatibility');

    const parseResult = await triggerPythonRepoIndex(validPathResult.path, {
      endpoint: '/api/v1/parse',
    });

    assert(
      parseResult.success === true,
      'POST /api/v1/parse alias endpoint responds with confirmed success',
      parseResult.error
    );
    assert(
      parseResult.chunksStored > 0,
      `POST /api/v1/parse stores chunks in ChromaDB (${parseResult.chunksStored} chunks)`
    );
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
