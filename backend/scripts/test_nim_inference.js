// Test NVIDIA NIM inference — does NOT print the API key
import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.NVIDIA_API_KEY;
const model = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';
const baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

if (!apiKey || apiKey === 'your_nvidia_api_key_here') {
  console.log('SKIP: NVIDIA_API_KEY not configured');
  process.exit(0);
}

console.log('Testing NVIDIA NIM inference...');
console.log('Model:', model);
console.log('Base URL:', baseURL);
console.log('Key configured: YES (length=' + apiKey.length + ')');

try {
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: NVIDIA NIM OK' }],
    max_tokens: 20,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content?.trim();
  console.log('Response received:', content ? 'YES' : 'NO');
  console.log('NVIDIA NIM inference: PASS');
} catch (err) {
  console.error('NVIDIA NIM inference: FAIL —', err.message);
  process.exit(1);
}
