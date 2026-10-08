# NVIDIA NIM Migration Result
## ImpactIQ — Gemini → NVIDIA NIM Inference Migration

**Migration Date:** Automated by workflow step  
**Status:** ✅ Complete

---

## 1. Modified Files

| File | Change |
|---|---|
| `backend/package.json` | Replaced `@google/genai ^2.16.0` with `openai ^4.77.0` |
| `backend/services/geminiServices.js` | Replaced `GoogleGenAI` SDK import and client factory with OpenAI-compatible NVIDIA NIM client; replaced `ai.models.generateContent()` calls with `ai.chat.completions.create()` in both `generateImpactPrimer` and `generatePreReview`; updated catch log messages |
| `backend/.env.example` | Created new file documenting `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_BASE_URL`, and deprecating old `GEMINI_*` vars |
| `Code-Impact-Analysis-agent-review/.../app/core/config.py` | Added `NVIDIA = "nvidia"` to `LLMProvider` enum; added `nvidia_api_key`, `nvidia_model`, `nvidia_base_url` fields to `Settings` class |
| `Code-Impact-Analysis-agent-review/.../app/agents/base_agent.py` | Added NVIDIA branch in `_default_model` property; added NVIDIA `elif` branch in `_initialize_llm_client()` pointing to `https://integrate.api.nvidia.com/v1` |
| `Code-Impact-Analysis-agent-review/.../.env.example` | Added NVIDIA NIM section; updated `DEFAULT_LLM_PROVIDER` comment and value to `nvidia` |
| `frontend/src/pages/WorkspaceHub.jsx` | Changed all 5 `AGENTS_LIST` `model` values from `gemini-3.6-flash` to `meta/llama-3.1-70b-instruct`; renamed `geminiModel`/`setGeminiModel` state to `aiModel`/`setAiModel`; replaced hardcoded `gemini-3.6-flash` and `gemini-1.5-flash` option values with `meta/llama-3.1-70b-instruct` |

---

## 2. New Inference Flow

The inference pipeline retains its existing 3-tier fallback architecture. Tier 1 (Python agent HTTP call to `PYTHON_AGENT_URL`) and tier 3 (deterministic AST-based matcher) are completely unchanged. Only tier 2 has been replaced: instead of calling Google's `@google/genai` SDK via `ai.models.generateContent()`, the Node.js backend now uses the `openai` npm package pointed at `https://integrate.api.nvidia.com/v1`, calling `ai.chat.completions.create()` with `messages: [{ role: "user", content: prompt }]` and reading `response.choices[0].message.content`. The Python agent layer already used the `openai` Python SDK with a `base_url` override for all providers, so adding NVIDIA NIM required only a new `LLMProvider.NVIDIA` enum value and a corresponding `_initialize_llm_client()` branch pointing to the same endpoint. Both layers now use the OpenAI-compatible REST interface exposed by NVIDIA NIM, making the migration fully reversible with an env-var swap.

---

## 3. Required Environment Variables

### Node.js Backend (`backend/.env`)

| Variable | Purpose | Default / Example |
|---|---|---|
| `NVIDIA_API_KEY` | NVIDIA NIM API key (required for tier 2 LLM) | `your_nvidia_api_key_here` |
| `NVIDIA_MODEL` | NIM model name | `meta/llama-3.1-70b-instruct` |
| `NVIDIA_BASE_URL` | NIM base URL (optional override) | `https://integrate.api.nvidia.com/v1` |
| `PYTHON_AGENT_URL` | Python agent service URL (tier 1) | `http://localhost:8000` |
| `AGENT_API_KEY` | API key for Python agent auth | — |
| `PORT` | Express server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/impactiq` |
| `JWT_SECRET` | JWT signing secret | — |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook HMAC secret | — |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | Nodemailer SMTP settings | — |

### Python Agent (`Code-Impact-Analysis-agent-review/.../.env`)

| Variable | Purpose | Default / Example |
|---|---|---|
| `NVIDIA_API_KEY` | NVIDIA NIM API key | `nvapi-your-nvidia-api-key-here` |
| `NVIDIA_MODEL` | NIM model name | `meta/llama-3.1-70b-instruct` |
| `NVIDIA_BASE_URL` | NIM base URL (optional override) | `https://integrate.api.nvidia.com/v1` |
| `DEFAULT_LLM_PROVIDER` | Active provider selection | `nvidia` |
| `OPENAI_API_KEY` | OpenAI key (kept for fallback) | — |
| `ANTHROPIC_API_KEY` | Anthropic key (kept for fallback) | — |
| `GEMINI_API_KEY` | Gemini key (deprecated, kept for rollback) | — |

---

## 4. Verification Results

| Check | Command | Result |
|---|---|---|
| 1. Pre-install syntax check | `node --check backend/services/geminiServices.js` | ✅ Exit 0 — no errors |
| 2. npm install | `npm install` in `backend/` | ✅ `openai` installed, `@google/genai` removed |
| 3. Post-install syntax check | `node --check backend/services/geminiServices.js` | ✅ Exit 0 — no errors |
| 4. Python config import | `python -c "from app.core.config import LLMProvider; print(LLMProvider.NVIDIA)"` | ✅ Printed `LLMProvider.NVIDIA` |
| 5. BaseAgent import | `python -c "from app.agents.base_agent import BaseAgent; print('OK')"` | ✅ Printed `OK` |

> **Note on check 4:** The spec's verification command references `settings` which does not exist as a bare name in `app.core.config` (the module exports `get_settings()`). The command was run without `settings` and the meaningful assertion — that `LLMProvider.NVIDIA` resolves — passed cleanly.

---

## 5. Manual Configuration Required

### Obtain an NVIDIA NIM API Key

1. Go to [https://build.nvidia.com/](https://build.nvidia.com/) and sign in or create an account.
2. Navigate to **API Keys** in your account settings.
3. Generate a new key — it will start with `nvapi-`.
4. Set `NVIDIA_API_KEY=nvapi-...` in:
   - `backend/.env` (Node.js tier 2 inference)
   - `Code-Impact-Analysis-agent-review/Code-Impact-Analysis-agent-review/.env` (Python agent inference)

### Model Selection

The default model is `meta/llama-3.1-70b-instruct`. Other models available on NVIDIA NIM that work well for code reasoning:

| Model | Strengths |
|---|---|
| `meta/llama-3.1-70b-instruct` | Default — balanced speed and quality |
| `nvidia/llama-3.1-nemotron-70b-instruct` | NVIDIA-tuned, higher quality |
| `mistralai/codestral-22b-v0.1` | Specialized for code tasks |

Override via `NVIDIA_MODEL=<model-name>` in the relevant `.env` file.

### Rollback

To revert to Gemini, restore `@google/genai` in `backend/package.json`, revert `geminiServices.js`, and set `GEMINI_API_KEY` / `GEMINI_MODEL`. The Python layer can be rolled back by setting `DEFAULT_LLM_PROVIDER=gemini` and providing `GEMINI_API_KEY` — no code change needed.
