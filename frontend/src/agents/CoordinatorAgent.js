/**
 * CoordinatorAgent.js
 *
 * Client-side interface and capability definition for the Coordinator Agent.
 * Orchestrates multi-agent workflow lifecycle, input validation, and execution tracing.
 */

export const CoordinatorAgent = {
  id: 'coord-agent',
  key: 'coordinator',
  name: 'Coordinator Agent',
  role: 'Workflow Orchestration, Input Validation & Lifecycle Tracing',
  model: 'meta/llama-3.2-11b-vision-instruct',
  description: 'Validates repository and requirement inputs, coordinates inter-agent dependencies, and enforces reliable error handling.',
  capabilities: [
    'Repository existence & scoping validation',
    'Requirement sanitization & credential redaction',
    'Execution run ID tracking and timing measurement',
    'Failure boundary management & partial result protection',
  ],
};

export default CoordinatorAgent;
