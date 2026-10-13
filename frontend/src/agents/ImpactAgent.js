/**
 * ImpactAgent.js
 *
 * Client-side interface and capability definition for the Code Impact Agent.
 * Grounded in Task 4 ChromaDB semantic retrieval and NVIDIA NIM inference.
 */

export const ImpactAgent = {
  id: 'impact-agent',
  key: 'impact',
  name: 'Code Impact Agent',
  role: 'AST Dependency Mapping, Semantic ChromaDB Retrieval & Grounded AI Analysis',
  model: 'meta/llama-3.2-11b-vision-instruct',
  description: 'Connects business requirements to exact codebase files, functions, and line numbers using vector search and NVIDIA NIM.',
  capabilities: [
    'ChromaDB semantic vector retrieval (top-5 verified chunks)',
    'Verified source evidence attribution (file, lines, symbol, similarity)',
    'Security boundary enforcement (passive untrusted input)',
    'Dynamic dependency graph synthesis & risk scoring',
  ],
};

export default ImpactAgent;
