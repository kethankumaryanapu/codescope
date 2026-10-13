// Test Nebius Token Factory live inference — does NOT print or log the API key or secret length
import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.NEBIUS_API_KEY;
const model = (process.env.NEBIUS_MODEL || 'nvidia/nemotron-3-super-120b-a12b').trim();
const baseURL = (process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1').replace(/\/+$/, '');

if (!apiKey || apiKey.trim() === '' || apiKey === 'your_nebius_api_key_here') {
  console.log('================================================================');
  console.log('Nebius Token Factory Live Inference Verification');
  console.log('================================================================');
  console.log('Provider: Nebius Token Factory');
  console.log('Model:', model);
  console.log('Base URL:', baseURL);
  console.log('Status: SKIP (NEBIUS_API_KEY not configured)');
  console.log('Note: To run a real live test against Nebius Token Factory, set NEBIUS_API_KEY in backend/.env.');
  process.exit(0);
}

console.log('================================================================');
console.log('Testing Nebius Token Factory Live Inference...');
console.log('================================================================');
console.log('Provider: Nebius Token Factory');
console.log('Model:', model);
console.log('Base URL:', baseURL);
console.log('Key configured: YES');

try {
  const client = new OpenAI({ apiKey: apiKey.trim(), baseURL, timeout: 30000 });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: NEBIUS TOKEN FACTORY OK' }],
    max_tokens: 30,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content?.trim();
  console.log('HTTP Status: 200 OK');
  console.log('Response received: YES');
  console.log('Sample content:', content);
  console.log('Nebius Token Factory inference: PASS');
} catch (err) {
  console.error('Nebius Token Factory inference: FAIL —', err.message);
  if (err.status) console.error('HTTP Status:', err.status);
  if (err.code) console.error('Error Code:', err.code);
  process.exit(1);
}
