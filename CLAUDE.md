# CLAUDE.md — GenAI Architecture Review Copilot

You are the SWE on this project. Aseem is the PM/architect — he has already made the product decisions below in a separate discovery process. **Do not re-litigate scope, niche, or features.** Your job is execution, not re-discovery.

## What this is

A single-page web app where a user pastes a description of a GenAI system they're building (RAG pipeline, agent, LLM workflow) and gets back a structured, senior-architect-level critique: scorecard, assumptions, risks with confidence scores, strengths, recommended changes, and one "killer insight."

**Internal focus, public umbrella:** the product accepts any GenAI architecture (RAG, agents, MCP, copilots, general LLM workflows) and will still produce a review for any of them. But prompt design, testing, and quality-bar validation are optimized specifically for **RAG systems and multi-agent/retrieval workflows** — that's where domain expertise is strongest and where output quality needs to be bulletproof. Don't burn testing time chasing quality on MCP-specific or other long-tail inputs; if RAG/agent quality is high, broader inputs will be decent by inheritance, not by separate effort.

This is a **portfolio/demo project** on a **12-day deadline**, not a startup. Optimize every decision for: ships fast, demos well, doesn't embarrass us with hallucinated specifics.

## Hard constraints — do not violate

1. **Model layer is AWS Bedrock (Claude model). Non-negotiable.** Do not suggest or default to the direct Anthropic API, OpenAI, or any other provider.
2. **Single model call per review.** One prompt in, one structured JSON out. No chains, no agents, no multi-step pipelines, no LangGraph, no retries-with-refinement. If you find yourself wanting to add a second call to "improve quality," stop — fix the prompt instead.
3. **No hallucinated precision.** The model must never output fabricated benchmark numbers (e.g., "fails at 247 QPS," "adds 340ms latency"). It reasons in **tradeoffs and judgment calls**, not invented metrics. This is enforced in the system prompt, and you should treat any drift toward fake-specific numbers in testing as a bug, not a feature.
4. **No persistence, no auth, no user accounts.** Stateless. Each review is a single request/response. Nothing is saved server-side.
5. **No diagram upload, no file upload.** Text input only.
6. **No multi-turn chat / refinement loop.** One input, one output. A "regenerate" button is fine; a conversational back-and-forth is not.

## Stack

- **Frontend:** React (functional components, hooks). Plain CSS or Tailwind — your call, pick one and be consistent. No component library bloat.
- **Backend:** Minimal API layer (Node/Express or a thin serverless function) whose only job is: receive input → call Bedrock → parse/validate JSON → return to frontend. Keep this thin.
- **Model access:** AWS Bedrock Runtime, Claude model (latest available Sonnet-tier on Bedrock — check what's actually provisioned in the account before hardcoding a model ID).
- **No database.** If you need to store the system prompt or example inputs, they're config/code, not data.

## Output schema — implement exactly this, do not redesign it

```json
{
  "assumptions": ["string"],
  "scorecard": {
    "scalability": {"score": 1-5, "justification": "string"},
    "reliability": {"score": 1-5, "justification": "string"},
    "security": {"score": 1-5, "justification": "string"},
    "cost_efficiency": {"score": 1-5, "justification": "string"}
  },
  "critical_risks": [
    {
      "risk": "string",
      "trigger": "the specific architectural choice + scale combination that causes this",
      "confidence": "high|medium|low",
      "reasoning": "string"
    }
  ],
  "strengths": ["string", "string"],
  "recommended_changes": [
    {"change": "string", "reasoning": "string"}
  ],
  "killer_insight": {
    "insight": "the single sharpest, most non-obvious tradeoff or judgment call",
    "why_it_matters": "string"
  }
}
```

`assumptions` always renders, whether the input was detailed or vague — it's how the model shows its work, not just a fallback for sparse input. If the user specified everything explicitly, this list can be short (1-2 items) or note that no major assumptions were needed; it should never be omitted from the schema.

`critical_risks` should typically have 3-5 items. `strengths` 2-3. No field is allowed to contain a fabricated number presented as fact (latency ms, QPS thresholds, cost figures) unless the user supplied that number themselves.

**Concreteness rule — non-negotiable:** every item in `critical_risks` must explicitly reference at least one architectural element the user actually mentioned (a named tool, component, or design choice from their input). A risk that could be copy-pasted into a review of any unrelated system is a failed output. "Retrieval systems can have latency issues" is a bug. "Synchronous reranking on top of Pinecone will compound latency as your corpus grows" is correct — it's tied to something the user actually said.

## System prompt requirements (you are writing this, not just the app code)

The Bedrock system prompt must:
- Establish the model as a senior GenAI/ML systems architect doing a design review.
- Encode a working knowledge of real GenAI-specific failure modes as **reasoning categories**, not as a numeric lookup table: vector DB behavior under concurrent load, embedding model staleness/drift over a changing corpus, retrieval-quality degradation patterns, context-window cost economics at scale, agent retry/loop cost blowups, reranker latency tradeoffs, chunking strategy failure modes.
- Explicitly forbid invented quantitative benchmarks. Tradeoffs and conditional reasoning only ("as X grows, Y becomes the bottleneck because Z" — not "Y fails at 250 units").
- Require a confidence score per risk, with the reasoning for that confidence tied to how much the input actually specified vs. how much is being inferred.
- **Forcing function for vague input:** if the user's description lacks scale numbers or specific stack components, the model must state explicit assumptions it's making in the `assumptions` field, then review against those stated assumptions. It must never silently assume and never refuse to review. Note: `assumptions` is now a required schema field for every response, not just a fallback for sparse input — it's how the model shows its reasoning, even on detailed inputs.
- **Concreteness, enforced at the prompt level:** every critical risk must name a specific element the user actually mentioned (a tool, component, or stated design choice). Generic risks that could apply to any system ("retrieval can be slow," "monitor costs") are failures. If you catch the model producing these during testing, that's the prompt bug to fix before anything else — it's the single biggest threat to output quality.
- Push hard for the `killer_insight` field to be genuinely non-obvious — not a restatement of the top critical_risk, but the one thing a competent mid-level engineer would miss and a senior architect would catch. It must also satisfy the concreteness rule.

## Build order (this is the actual plan — follow it)

1. Bedrock connectivity smoke test (raw call, no app) — confirm model ID, auth, and structured JSON output work before building anything else.
2. System prompt v1, tested against the canonical example (below) via raw API calls, iterated until output quality is right. Do this *before* touching the frontend.
3. Thin backend endpoint wrapping the call + JSON validation/repair (models occasionally emit near-JSON; handle it).
4. Frontend: input form → loading state → rendered output (scorecard, risks w/ confidence badges, strengths, recommendations, killer insight highlighted).
5. Polish pass: visual design (this is a portfolio piece — it should look intentional, not like a default Bootstrap form), error states, the canonical example as a "try this" preset button.

Do not start frontend work before step 2 is producing good output. A pretty UI around a mediocre prompt is a wasted week.

## Canonical demo example (use this for all prompt testing)

> "I'm building a RAG-based customer support platform for 1M users, using OpenAI embeddings + Pinecone + GPT-4 for generation, expecting 10K daily active users, sub-2-second response requirement."

The target output for this example should surface a tradeoff like synchronous reranking vs. SLA risk as document volume grows — framed as architectural judgment, never as an invented number.

## Definition of "good enough to ship"

On the canonical example AND on at least one deliberately vague/underspecified test input, the output must: contain at least one specific, non-generic architectural tradeoff a generic "review my architecture" ChatGPT prompt would not reliably produce; show zero fabricated quantitative claims; and pass the concreteness rule on every critical risk (each one names something the user actually mentioned). If any of these fail, fix the prompt before touching anything else.

## What "done" looks like for V1

A working hosted (or locally runnable) app where: user pastes the canonical example into a textarea, clicks review, and within ~10-15 seconds sees a clean structured breakdown matching the schema above, with the killer insight visually distinct from the rest. That's it. That's V1.
