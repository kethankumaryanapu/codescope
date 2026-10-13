// Test NVIDIA NIM inference — does NOT print the API key or secret length
import 'dotenv/config';
import OpenAI from 'openai';

const apiKey = process.env.NVIDIA_API_KEY;
const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct';
const baseURL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';

if (!apiKey || apiKey.trim() === '' || apiKey === 'your_nvidia_api_key_here') {
  console.log('SKIP: NVIDIA_API_KEY not configured');
  process.exit(0);
}

console.log('Testing NVIDIA NIM inference...');
console.log('Model:', model);
console.log('Base URL:', baseURL);
console.log('Key configured: YES');

try {
  const client = new OpenAI({ apiKey: apiKey.trim(), baseURL });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: 'Reply with exactly: NVIDIA NIM OK' }],
    max_tokens: 30,
    temperature: 0,
  });
  const content = response.choices[0]?.message?.content?.trim();
  console.log('HTTP Status: 200 OK');
  console.log('Response received: YES');
  console.log('Sample content:', content);
  console.log('NVIDIA NIM inference: PASS');
} catch (err) {
  console.error('NVIDIA NIM inference: FAIL —', err.message);
  if (err.status) console.error('HTTP Status:', err.status);
  if (err.code) console.error('Error Code:', err.code);
  process.exit(1);
}
