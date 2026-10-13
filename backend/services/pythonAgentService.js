import fs from 'fs';
import path from 'path';

/**
 * Service bridge between Node.js backend and Python FastAPI Multi-Agent Indexing Pipeline
 */

const getAgentUrl = () => process.env.PYTHON_AGENT_URL || 'http://localhost:8000';
const getApiKey = () => process.env.AGENT_API_KEY || '';
const getTimeoutMs = () => parseInt(process.env.PYTHON_INDEXING_TIMEOUT_MS, 10) || 60000;

/**
 * Check Python service health
 * @returns {Promise<{available: boolean, status: string, data?: object, error?: string}>}
 */
export const checkPythonServiceHealth = async () => {
  const url = `${getAgentUrl()}/api/v1/health`;
  const apiKey = getApiKey();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { available: true, status: data.status || 'healthy', data };
    }
    return { available: false, status: 'error', statusCode: res.status };
  } catch (err) {
    return { available: false, status: 'unavailable', error: err.message };
  }
};

/**
 * Get ChromaDB vector store statistics from Python service
 * @returns {Promise<{success: boolean, stats?: object, error?: string}>}
 */
export const getPythonEmbeddingStats = async () => {
  const url = `${getAgentUrl()}/api/v1/embeddings/stats`;
  const apiKey = getApiKey();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, stats: data };
    }
    return { success: false, statusCode: res.status, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Trigger Python repository parsing & ChromaDB embedding indexing.
 * Calls Python FastAPI indexing pipeline with validated repository path.
 * 
 * Supports both /api/v1/embeddings/generate (primary ChromaDB indexing pipeline)
 * and /api/v1/parse (with store_embeddings=True).
 * 
 * @param {string} repositoryPath - Absolute, validated filesystem path to repository
 * @param {object} options - Optional parameters (collectionName, fileExtensions, endpoint, timeoutMs)
 * @returns {Promise<object>} Result containing status, chunksStored, durationMs, etc.
 */
export const triggerPythonRepoIndex = async (repositoryPath, options = {}) => {
  if (!repositoryPath || typeof repositoryPath !== 'string') {
    return {
      success: false,
      status: 'invalid_path',
      error: 'Repository path must be a non-empty string',
      chunksStored: 0,
    };
  }

  // Security check: Must exist on filesystem and be a directory
  try {
    if (!fs.existsSync(repositoryPath)) {
      return {
        success: false,
        status: 'path_not_found',
        error: `Repository path does not exist on filesystem: ${repositoryPath}`,
        chunksStored: 0,
      };
    }
    const stat = fs.statSync(repositoryPath);
    if (!stat.isDirectory()) {
      return {
        success: false,
        status: 'not_a_directory',
        error: `Repository path is not a directory: ${repositoryPath}`,
        chunksStored: 0,
      };
    }
  } catch (err) {
    return {
      success: false,
      status: 'path_inaccessible',
      error: `Failed to access repository path: ${err.message}`,
      chunksStored: 0,
    };
  }

  const normalizedPath = path.resolve(repositoryPath);
  // Default to /api/v1/embeddings/generate which parses, generates embeddings, and stores in ChromaDB.
  // Can be overridden via options.endpoint or process.env.PYTHON_INDEXING_ENDPOINT.
  const endpoint = options.endpoint || process.env.PYTHON_INDEXING_ENDPOINT || '/api/v1/embeddings/generate';
  const url = `${getAgentUrl()}${endpoint}`;
  const apiKey = getApiKey();
  const timeoutMs = options.timeoutMs || getTimeoutMs();

  const payload = {
    repository_path: normalizedPath,
    ...(options.fileExtensions ? { file_extensions: options.fileExtensions } : {}),
    ...(options.collectionName ? { collection_name: options.collectionName } : {}),
    // For /api/v1/parse or /api/v1/repository/parse compatibility:
    store_embeddings: true,
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      let errorDetail = `Python service returned HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Response wasn't JSON
      }
      return {
        success: false,
        status: 'failed',
        statusCode: response.status,
        error: errorDetail,
        endpoint,
        durationMs,
        chunksStored: 0,
      };
    }

    const data = await response.json();

    // Verify response schema and confirm indexing
    const chunksStored = data.total_chunks_stored !== undefined
      ? data.total_chunks_stored
      : data.total_chunks !== undefined
      ? data.total_chunks
      : null;

    if (chunksStored === null) {
      return {
        success: false,
        status: 'invalid_response',
        error: 'Python service response missing chunk count confirmation',
        endpoint,
        durationMs,
        chunksStored: 0,
        rawResponse: data,
      };
    }

    return {
      success: true,
      status: 'success',
      endpoint,
      repositoryPath: data.repository_path || normalizedPath,
      filesParsed: data.total_files_parsed || data.total_files_scanned || 0,
      chunksEmbedded: data.total_chunks_embedded || chunksStored,
      chunksStored,
      embeddingProvider: data.embedding_provider || 'local',
      collectionName: data.collection_name || 'code_chunks',
      durationMs: data.duration_ms || durationMs,
      indexedAt: data.generated_at || data.parsed_at || new Date().toISOString(),
      rawResponse: data,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return {
        success: false,
        status: 'timeout',
        error: `Python indexing request timed out after ${timeoutMs}ms`,
        endpoint,
        durationMs,
        chunksStored: 0,
      };
    }

    return {
      success: false,
      status: 'unavailable',
      error: `Python agent service is unreachable at ${getAgentUrl()}: ${err.message}`,
      endpoint,
      durationMs,
      chunksStored: 0,
    };
  }
};

/**
 * Redacts common credential and secret patterns to prevent accidental leakage into the vector store.
 * @param {string} text - Raw query or requirement string
 * @returns {string} Sanitized query string
 */
export const sanitizeSearchQuery = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(?:bearer\s+[a-zA-Z0-9_\-\.]+)/gi, '[REDACTED_BEARER_TOKEN]')
    .replace(/(?:api[_-]?key[:=\s]+['"]?[a-zA-Z0-9_\-\.]{8,}['"]?)/gi, 'api_key=[REDACTED]')
    .replace(/(?:password[:=\s]+['"]?[^\s'"]+['"]?)/gi, 'password=[REDACTED]')
    .replace(/(?:ghp_[a-zA-Z0-9]{20,})/gi, '[REDACTED_GH_TOKEN]')
    .replace(/(?:nvapi-[a-zA-Z0-9_\-]{20,})/gi, '[REDACTED_NVIDIA_KEY]');
};

/**
 * Search ChromaDB code chunks via Python FastAPI semantic search service.
 * Calls POST /api/v1/search (aliased to /api/v1/embeddings/search).
 *
 * @param {string} query - Natural-language query, requirement text, or code identifier
 * @param {object} [options] - Optional search parameters
 * @param {number} [options.topK=5] - Number of results to return (1-100)
 * @param {string} [options.languageFilter] - Optional language filter ('javascript', 'python', etc.)
 * @param {string} [options.collectionName] - ChromaDB collection name (defaults to 'code_chunks')
 * @param {number} [options.timeoutMs=25000] - Request timeout in milliseconds
 * @returns {Promise<{success: boolean, query?: string, totalResults?: number, results: Array, durationMs?: number, error?: string, status?: string}>}
 */
export const searchCodebase = async (query, options = {}) => {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return {
      success: false,
      status: 'invalid_query',
      error: 'Search query must be a non-empty string',
      results: [],
    };
  }

  // Sanitize query of potential credentials and constrain length to 1000 characters
  const sanitized = sanitizeSearchQuery(query.trim());
  const cleanQuery = sanitized.slice(0, 1000);

  const endpoint = options.endpoint || '/api/v1/search';
  const url = `${getAgentUrl()}${endpoint}`;
  const apiKey = getApiKey();
  const defaultSearchTimeout = parseInt(process.env.PYTHON_SEARCH_TIMEOUT_MS, 10) || 25000;
  const timeoutMs = options.timeoutMs || defaultSearchTimeout;

  const payload = {
    query: cleanQuery,
    top_k: options.topK || options.top_k || 5,
    ...(options.languageFilter ? { language_filter: options.languageFilter } : {}),
    ...(options.collectionName ? { collection_name: options.collectionName } : {}),
  };

  const startTime = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      let errorDetail = `Python search service returned HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Non-JSON response
      }
      return {
        success: false,
        status: 'failed',
        statusCode: res.status,
        error: errorDetail,
        durationMs,
        results: [],
      };
    }

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      return {
        success: false,
        status: 'malformed_response',
        error: `Python search service returned malformed JSON: ${parseErr.message}`,
        durationMs,
        results: [],
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        status: 'malformed_response',
        error: 'Python search service returned unexpected response payload (non-object)',
        durationMs,
        results: [],
      };
    }

    // Validate and normalize results list
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const validatedResults = rawResults
      .filter((item) => item && typeof item === 'object' && Boolean(item.file_path))
      .map((item) => ({
        chunk_id: String(item.chunk_id || ''),
        file_path: String(item.file_path || '').replace(/\\/g, '/'),
        language: String(item.language || 'unknown'),
        chunk_type: String(item.chunk_type || 'code'),
        entity_name: String(item.entity_name || ''),
        code_content: typeof item.code_content === 'string' ? item.code_content : '',
        start_line: Number.isInteger(item.start_line) ? item.start_line : parseInt(item.start_line, 10) || 0,
        end_line: Number.isInteger(item.end_line) ? item.end_line : parseInt(item.end_line, 10) || 0,
        parent_entity: String(item.parent_entity || ''),
        docstring: String(item.docstring || ''),
        similarity: typeof item.similarity === 'number' ? item.similarity : parseFloat(item.similarity) || 0.0,
        distance: typeof item.distance === 'number'
          ? item.distance
          : roundDistance(item.similarity),
      }));

    return {
      success: true,
      status: 'success',
      query: data.query || cleanQuery,
      totalResults: data.total_results || validatedResults.length,
      embeddingProvider: data.embedding_provider || 'local',
      results: validatedResults,
      durationMs: data.search_duration_ms || durationMs,
      searchedAt: data.searched_at || new Date().toISOString(),
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
    return {
      success: false,
      status: isTimeout ? 'timeout' : 'unavailable',
      error: isTimeout
        ? `Python search request timed out after ${timeoutMs}ms`
        : `Python search service unreachable at ${getAgentUrl()}: ${err.message}`,
      durationMs,
      results: [],
    };
  }
};

const roundDistance = (similarity) => {
  if (typeof similarity !== 'number' || isNaN(similarity)) return 1.0;
  return Math.max(0, Math.min(1, Math.round((1.0 - similarity) * 1000000) / 1000000));
};
