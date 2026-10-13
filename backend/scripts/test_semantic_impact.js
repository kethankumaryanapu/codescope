/**
 * test_semantic_impact.js
 * 
 * Verification suite for Task 4: Connect Semantic Retrieval to AI Impact Analysis.
 * Tests:
 *  1. searchCodebase function on live Python FastAPI service (ChromaDB retrieval).
 *  2. searchCodebase input validation (empty/invalid query).
 *  3. searchCodebase error handling on simulated downtime.
 *  4. generateImpactPrimer end-to-end with live semantic retrieval + NVIDIA NIM inference.
 *  5. generateImpactPrimer graceful degradation when Python search is offline.
 */

import dotenv from 'dotenv';
dotenv.config();

import { searchCodebase, checkPythonServiceHealth } from '../services/pythonAgentService.js';
import { generateImpactPrimer } from '../services/geminiServices.js';
import { getAllIndexedFilesWithDetails } from '../services/codeIndexer.js';

let passed = 0;
let failed = 0;

const assert = (condition, message, details = '') => {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${message}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${message}`);
    if (details) console.error(`    Details: ${details}`);
  }
};

const runSuite = async () => {
  console.log('================================================================');
  console.log('Codescope Task 4: Semantic Retrieval -> AI Impact Analysis Suite');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // Suite 1: Python Service Health & searchCodebase Unit Tests
  // --------------------------------------------------------------------------
  console.log('TEST SUITE 1: Python FastAPI & ChromaDB Semantic Search Bridge');

  const health = await checkPythonServiceHealth();
  assert(health.available === true, 'Python agent service is available on port 8000', health.error);

  // Test invalid queries
  const emptyRes = await searchCodebase('');
  assert(emptyRes.success === false && emptyRes.status === 'invalid_query', 'searchCodebase rejects empty query safely');

  const nullRes = await searchCodebase(null);
  assert(nullRes.success === false && nullRes.status === 'invalid_query', 'searchCodebase rejects null query safely');

  // Test real semantic search query
  const searchQuery = 'handleScanRepository triggerPythonRepoIndex';
  const searchRes = await searchCodebase(searchQuery, { topK: 5 });
  assert(searchRes.success === true, 'searchCodebase succeeds with HTTP 200 equivalent', searchRes.error);
  assert(Array.isArray(searchRes.results) && searchRes.results.length > 0, `searchCodebase returns results array (found ${searchRes.results?.length} chunks)`);

  const topChunk = searchRes.results?.[0];
  assert(Boolean(topChunk?.chunk_id), 'Retrieved chunk contains chunk_id', topChunk?.chunk_id);
  assert(Boolean(topChunk?.file_path), 'Retrieved chunk contains file_path', topChunk?.file_path);
  assert(typeof topChunk?.similarity === 'number' && topChunk.similarity > 0, 'Retrieved chunk contains valid numeric similarity', String(topChunk?.similarity));
  assert(typeof topChunk?.code_content === 'string' && topChunk.code_content.length > 0, 'Retrieved chunk contains verbatim code_content');
  assert(typeof topChunk?.start_line === 'number' && typeof topChunk?.end_line === 'number', 'Retrieved chunk contains line coordinates', `${topChunk?.start_line}-${topChunk?.end_line}`);

  console.log(`    Top match: ${topChunk?.file_path} :: ${topChunk?.entity_name} (${(topChunk?.similarity * 100).toFixed(1)}% similarity)`);

  // --------------------------------------------------------------------------
  // Suite 2: Simulated Downtime & Graceful Degradation
  // --------------------------------------------------------------------------
  console.log('\nTEST SUITE 2: Graceful Error Handling & Downtime Resilience');

  const origUrl = process.env.PYTHON_AGENT_URL;
  try {
    process.env.PYTHON_AGENT_URL = 'http://localhost:59997'; // down port
    const downRes = await searchCodebase('test query', { timeoutMs: 2000 });
    assert(downRes.success === false, 'searchCodebase returns success: false on unreachable port');
    assert(downRes.status === 'unavailable' || downRes.status === 'timeout', 'searchCodebase reports unavailable/timeout status without crashing');
    assert(Array.isArray(downRes.results) && downRes.results.length === 0, 'searchCodebase returns empty results array on downtime');
  } finally {
    process.env.PYTHON_AGENT_URL = origUrl || 'http://localhost:8000';
  }

  // --------------------------------------------------------------------------
  // Suite 3: End-to-End generateImpactPrimer with Semantic Retrieval + NVIDIA NIM
  // --------------------------------------------------------------------------
  console.log('\nTEST SUITE 3: End-to-End Impact Primer with Semantic Code Context');

  const detailedFiles = getAllIndexedFilesWithDetails('repo-1');
  const candidateFiles = detailedFiles.map((f) => ({
    filePath: f.filePath || f.rootPath,
    module: f.module,
    functions: f.functions,
    lineCount: f.lineCount,
    isTestFile: f.isTestFile,
  }));

  const brdText = `Requirement: JIRA-501 Connect Repository Scanning to Python ChromaDB Indexing
Update handleScanRepository in repoController.js to invoke triggerPythonRepoIndex using resolveValidatedRepoPath and verify ChromaDB code chunk storage.`;

  console.log('  Executing generateImpactPrimer with live NVIDIA NIM and ChromaDB retrieval...');
  const primerStartTime = Date.now();
  const primerResult = await generateImpactPrimer(brdText, candidateFiles);
  const primerDuration = (Date.now() - primerStartTime) / 1000;
  console.log(`  Completed in ${primerDuration.toFixed(2)}s`);

  // Assertions on semantic retrieval metadata
  assert(primerResult.aiMetadata?.semanticRetrieval?.performed === true, 'Semantic retrieval was performed');
  assert(primerResult.aiMetadata?.semanticRetrieval?.chunksRetrieved > 0, `Retrieved ${primerResult.aiMetadata?.semanticRetrieval?.chunksRetrieved} chunks for LLM context`);
  assert(typeof primerResult.aiMetadata?.semanticRetrieval?.topSimilarity === 'number', 'Retrieval metadata records top similarity score', String(primerResult.aiMetadata?.semanticRetrieval?.topSimilarity));

  // Assertions on retrievedChunks in response
  assert(Array.isArray(primerResult.retrievedChunks) && primerResult.retrievedChunks.length > 0, 'Response includes retrievedChunks array for UI inspection');
  assert(Boolean(primerResult.retrievedChunks[0]?.filePath), 'retrievedChunks item contains filePath', primerResult.retrievedChunks[0]?.filePath);
  assert(Boolean(primerResult.retrievedChunks[0]?.entityName), 'retrievedChunks item contains entityName', primerResult.retrievedChunks[0]?.entityName);

  // Assertions on live AI inference
  assert(primerResult.aiMetadata?.liveInference === true, 'aiMetadata confirms liveInference === true');
  assert(primerResult.aiMetadata?.source === 'nvidia-nim', 'aiMetadata confirms source === "nvidia-nim"');
  assert(primerResult.aiMetadata?.model === 'meta/llama-3.2-11b-vision-instruct', 'aiMetadata confirms configured NVIDIA model');

  // Assertions on summaryMarkdown output
  assert(typeof primerResult.summaryMarkdown === 'string' && primerResult.summaryMarkdown.length > 100, 'summaryMarkdown is non-empty structured markdown');
  assert(primerResult.summaryMarkdown.includes('JIRA-501'), 'summaryMarkdown references the requirement ID');
  assert(
    primerResult.summaryMarkdown.toLowerCase().includes('repo') || primerResult.summaryMarkdown.toLowerCase().includes('controller'),
    'summaryMarkdown cites codebase components'
  );

  // Assertions on impactedFiles
  assert(Array.isArray(primerResult.impactedFiles) && primerResult.impactedFiles.length > 0, `impactedFiles populated with ${primerResult.impactedFiles.length} files`);
  const topImpacted = primerResult.impactedFiles[0];
  assert(Boolean(topImpacted?.file), 'impactedFiles item has file path', topImpacted?.file);
  assert(Boolean(topImpacted?.risk), 'impactedFiles item has risk level', topImpacted?.risk);
  assert(Boolean(topImpacted?.reason), 'impactedFiles item has grounded reason', topImpacted?.reason);

  // Assertions on graph and stats
  assert(Array.isArray(primerResult.graph?.nodes) && primerResult.graph.nodes.length >= 2, 'Graph nodes generated with requirement and file nodes');
  assert(Array.isArray(primerResult.graph?.edges) && primerResult.graph.edges.length >= 1, 'Graph edges connect requirement to impacted components');
  assert(primerResult.stats?.impactedFilesCount > 0, 'Stats reflects impactedFilesCount > 0');

  // --------------------------------------------------------------------------
  // Suite 4: generateImpactPrimer Fallback during Python Offline
  // --------------------------------------------------------------------------
  console.log('\nTEST SUITE 4: Impact Primer Graceful Fallback when Python is Offline');

  try {
    process.env.PYTHON_AGENT_URL = 'http://localhost:59996';
    const fallbackResult = await generateImpactPrimer(brdText, candidateFiles);

    assert(Boolean(fallbackResult.summaryMarkdown), 'Generates summaryMarkdown even when Python retrieval is offline');
    assert(fallbackResult.aiMetadata?.semanticRetrieval?.chunksRetrieved === 0, 'Correctly flags 0 chunks retrieved when Python is offline');
    assert(fallbackResult.impactedFiles?.length > 0, 'Impacted files populated via AST candidates fallback');
    assert(fallbackResult.graph?.nodes?.length > 0, 'Graph generated via fallback nodes');
  } finally {
    process.env.PYTHON_AGENT_URL = origUrl || 'http://localhost:8000';
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

runSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
