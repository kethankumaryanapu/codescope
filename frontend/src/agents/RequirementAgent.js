/**
 * RequirementAgent.js
 *
 * Client-side interface and capability definition for the Requirement Analysis Agent.
 * Parses, categorizes, and extracts structured technical concepts from BRD/Jira documents.
 */

export const RequirementAgent = {
  id: 'req-agent',
  key: 'requirement',
  name: 'Requirement Analysis Agent',
  role: 'BRD / Jira Parsing, Domain Classification & Acceptance Criteria Extraction',
  model: 'meta/llama-3.2-11b-vision-instruct',
  description: 'Deconstructs business specifications into actionable technical components, domain tags, and acceptance checklists.',
  capabilities: [
    'Domain classification (Security, Payments, Data, API)',
    'Technical concept and symbol tokenization',
    'Acceptance criteria checklist extraction',
    'Complexity scoring and scope estimation',
  ],
};

export default RequirementAgent;
