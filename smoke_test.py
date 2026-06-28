#!/usr/bin/env python3
"""
Bedrock smoke test — runs BEFORE any app code.
Usage: python3 smoke_test.py
"""

import boto3
import json
import os
import sys

from dotenv import load_dotenv
load_dotenv()

REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

# Models to try in order — first available wins
CANDIDATE_MODELS = [
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
]

CANONICAL_INPUT = (
    "I'm building a RAG-based customer support platform for 1M users, "
    "using OpenAI embeddings + Pinecone + GPT-4 for generation, "
    "expecting 10K daily active users, sub-2-second response requirement."
)

DRAFT_SYSTEM_PROMPT = """You are a senior GenAI/ML systems architect conducting a design review.

Your job is to produce a rigorous, specific architectural critique of the GenAI system the user describes.

RULES — violating any of these is a failure:
1. Every critical_risk must name at least one specific tool, component, or design choice the user actually mentioned. Generic risks ("retrieval can be slow") are FORBIDDEN.
2. Never invent quantitative benchmarks (latency ms, QPS numbers, cost figures, token counts). Reason in tradeoffs: "as X grows, Y becomes the bottleneck because Z" — not "Y fails at 250 units."
3. Confidence scores must reflect how much the user specified vs. how much you're inferring. Low confidence = mostly inferred. High confidence = user gave enough specifics to reason concretely.
4. If the input is vague or missing scale/stack details, state your assumptions explicitly in the `assumptions` field, then review against those stated assumptions. Never silently assume. Never refuse to review.
5. The `killer_insight` must be genuinely non-obvious — the thing a competent mid-level engineer would miss. Not a restatement of the top risk.
6. `assumptions` is required in every response. On a detailed input it can be short (1-2 items); it must never be omitted.

OUTPUT FORMAT — return ONLY valid JSON matching this exact schema, no prose before or after:

{
  "assumptions": ["string"],
  "scorecard": {
    "scalability": {"score": 1, "justification": "string"},
    "reliability": {"score": 1, "justification": "string"},
    "security": {"score": 1, "justification": "string"},
    "cost_efficiency": {"score": 1, "justification": "string"}
  },
  "critical_risks": [
    {
      "risk": "string",
      "trigger": "the specific architectural choice + scale combination that causes this",
      "confidence": "high|medium|low",
      "reasoning": "string"
    }
  ],
  "strengths": ["string"],
  "recommended_changes": [
    {"change": "string", "reasoning": "string"}
  ],
  "killer_insight": {
    "insight": "string",
    "why_it_matters": "string"
  }
}

Scores are integers 1-5. critical_risks: 3-5 items. strengths: 2-3 items.
"""


def list_available_claude_models(client):
    try:
        resp = client.list_foundation_models(byProvider="Anthropic")
        return [m["modelId"] for m in resp.get("modelSummaries", [])]
    except Exception as e:
        print(f"  Could not list models: {e}")
        return []


def try_invoke(bedrock_rt, model_id, user_input):
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "system": DRAFT_SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_input}],
    }
    resp = bedrock_rt.invoke_model(
        modelId=model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    raw = json.loads(resp["body"].read())
    text = raw["content"][0]["text"]
    return text


def main():
    print("=== Bedrock Smoke Test ===\n")

    # 1. Auth check
    print("1. Checking AWS identity...")
    try:
        sts = boto3.client("sts", region_name=REGION)
        identity = sts.get_caller_identity()
        print(f"   Account: {identity['Account']}")
        print(f"   ARN:     {identity['Arn']}\n")
    except Exception as e:
        print(f"   FAIL — auth error: {e}")
        print("\nFix: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION")
        sys.exit(1)

    # 2. List available Claude models
    print("2. Listing available Claude models on Bedrock...")
    bedrock = boto3.client("bedrock", region_name=REGION)
    available = list_available_claude_models(bedrock)
    if available:
        for m in available:
            print(f"   {m}")
    else:
        print("   (could not list — will try candidates directly)")
    print()

    # 3. Find working model
    print("3. Finding callable model...")
    bedrock_rt = boto3.client("bedrock-runtime", region_name=REGION)
    working_model = None
    for model_id in CANDIDATE_MODELS:
        try:
            print(f"   Trying {model_id}...")
            # minimal test call
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 10,
                "messages": [{"role": "user", "content": "ping"}],
            }
            bedrock_rt.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            working_model = model_id
            print(f"   OK — using {model_id}\n")
            break
        except Exception as e:
            print(f"   FAIL: {e}")

    if not working_model:
        print("\nNo Claude model available. Go to AWS Console → Bedrock → Model access and enable a Claude Sonnet model.")
        sys.exit(1)

    # 4. Real smoke test with canonical input
    print(f"4. Running canonical example through {working_model}...")
    print(f"   Input: {CANONICAL_INPUT[:80]}...\n")
    try:
        raw_text = try_invoke(bedrock_rt, working_model, CANONICAL_INPUT)
        print("=== RAW MODEL OUTPUT ===")
        print(raw_text)
        print("========================\n")

        # Strip markdown fences if present
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1]
            clean = clean.rsplit("```", 1)[0].strip()

        # Try parse
        try:
            parsed = json.loads(clean)
            print("JSON parse: OK")
            print(f"  assumptions:         {len(parsed.get('assumptions', []))} items")
            print(f"  critical_risks:      {len(parsed.get('critical_risks', []))} items")
            print(f"  strengths:           {len(parsed.get('strengths', []))} items")
            print(f"  recommended_changes: {len(parsed.get('recommended_changes', []))} items")
            print(f"  killer_insight:      {'present' if parsed.get('killer_insight') else 'MISSING'}")
            print(f"\nSMOKE TEST PASSED — model: {working_model}")
        except json.JSONDecodeError as e:
            print(f"JSON parse FAIL: {e}")
            print("Raw text above — check if model wrapped in markdown fences")
    except Exception as e:
        print(f"Invocation FAIL: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
