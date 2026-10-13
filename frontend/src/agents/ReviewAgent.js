/**
 * ReviewAgent.js
 *
 * Client-side interface and capability definition for the Senior Staff Pre-Review Agent.
 * Evaluates code diffs against requirement specifications and upstream impact risks.
 */

export const ReviewAgent = {
  id: 'review-agent',
  key: 'review',
  name: 'Senior Pre-Review Agent',
  role: 'Diff Inspection, Standards Verification & Regression Risk Evaluation',
  model: 'meta/llama-3.2-11b-vision-instruct',
  description: 'Inspects raw git diffs, cross-references with upstream impact reports, and detects regression risks and missing tests.',
  capabilities: [
    'Unified git diff parsing & churn analysis',
    'Cross-referencing diff changes against high-risk impacted components',
    'Quality scoring, security inspection & error boundary validation',
    'Unit test gap detection and coverage checking',
  ],
};

export default ReviewAgent;
