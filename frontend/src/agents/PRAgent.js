/**
 * PRAgent.js
 *
 * Client-side interface and capability definition for the PR Generator Agent.
 * Generates enterprise Pull Request descriptions only when code changes are provided.
 */

export const PRAgent = {
  id: 'pr-agent',
  key: 'pr',
  name: 'PR Generator Agent',
  role: 'Pull Request Synthesis & Production Release Documentation',
  model: 'meta/llama-3.2-11b-vision-instruct',
  description: 'Synthesizes upstream requirement, impact, and review evidence into a grounded, comprehensive PR draft.',
  capabilities: [
    'Upstream requirement & acceptance criteria synthesis',
    'Verified source component citation in release notes',
    'Code review checklists and quality score inclusion',
    'Strict omission when no actual code changes are provided',
  ],
};

export default PRAgent;
