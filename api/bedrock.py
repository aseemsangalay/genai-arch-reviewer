from __future__ import annotations
import boto3
import json
import os
from api.prompt import SYSTEM_PROMPT

REVIEW_TOOL_SCHEMA = {
    "name": "architecture_review",
    "description": "Output the structured GenAI architecture review.",
    "input_schema": {
        "type": "object",
        "required": [
            "assumptions", "scorecard", "critical_risks",
            "strengths", "recommended_changes", "killer_insight",
            "key_unresolved_decisions", "review_confidence",
        ],
        "properties": {
            "architecture_diagram": {
                "type": "object",
                "description": "Mermaid flowchart of the architecture. Set to null if input is too vague.",
                "properties": {
                    "mermaid": {"type": "string"}
                }
            },
            "assumptions": {
                "type": "array",
                "items": {"type": "string"}
            },
            "scorecard": {
                "type": "object",
                "required": ["scalability", "reliability", "security", "cost_efficiency"],
                "properties": {
                    "scalability": {
                        "type": "object",
                        "required": ["score", "justification"],
                        "properties": {
                            "score": {"type": "integer"},
                            "justification": {"type": "string"}
                        }
                    },
                    "reliability": {
                        "type": "object",
                        "required": ["score", "justification"],
                        "properties": {
                            "score": {"type": "integer"},
                            "justification": {"type": "string"}
                        }
                    },
                    "security": {
                        "type": "object",
                        "required": ["score", "justification"],
                        "properties": {
                            "score": {"type": "integer"},
                            "justification": {"type": "string"}
                        }
                    },
                    "cost_efficiency": {
                        "type": "object",
                        "required": ["score", "justification"],
                        "properties": {
                            "score": {"type": "integer"},
                            "justification": {"type": "string"}
                        }
                    }
                }
            },
            "critical_risks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["risk", "trigger", "confidence", "reasoning"],
                    "properties": {
                        "risk": {"type": "string"},
                        "trigger": {"type": "string"},
                        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                        "reasoning": {"type": "string"}
                    }
                }
            },
            "strengths": {
                "type": "array",
                "items": {"type": "string"}
            },
            "recommended_changes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["change", "reasoning"],
                    "properties": {
                        "change": {"type": "string"},
                        "reasoning": {"type": "string"}
                    }
                }
            },
            "killer_insight": {
                "type": "object",
                "required": ["insight", "why_it_matters"],
                "properties": {
                    "insight": {"type": "string"},
                    "why_it_matters": {"type": "string"}
                }
            },
            "key_unresolved_decisions": {
                "type": "array",
                "items": {"type": "string"}
            },
            "review_confidence": {
                "type": "object",
                "required": ["score", "missing"],
                "properties": {
                    "score": {"type": "integer"},
                    "missing": {"type": "array", "items": {"type": "string"}}
                }
            }
        }
    }
}


def get_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )


def _is_claude(model_id: str) -> bool:
    return "anthropic" in model_id or "claude" in model_id


def build_request_body(user_input: str, model_id: str) -> dict:
    if _is_claude(model_id):
        # Force structured output via tool_use — eliminates JSON repair entirely
        return {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_input}],
            "tools": [REVIEW_TOOL_SCHEMA],
            "tool_choice": {"type": "tool", "name": "architecture_review"},
        }
    if "deepseek" in model_id:
        return {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_input},
            ],
            "max_tokens": 4096,
            "temperature": 0.3,
        }
    if "llama" in model_id:
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
            f"{SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n"
            f"{user_input}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
        )
        return {"prompt": prompt, "max_gen_len": 4096, "temperature": 0.3}
    if "nova" in model_id or "amazon" in model_id:
        return {
            "messages": [{"role": "user", "content": [{"text": user_input}]}],
            "system": [{"text": SYSTEM_PROMPT}],
            "inferenceConfig": {"maxTokens": 4096, "temperature": 0.3},
        }
    # default: claude format with tool_use
    return build_request_body(user_input, "claude")


def extract_text(response_body: dict, model_id: str) -> str | dict:
    if _is_claude(model_id):
        # Tool use response — extract the tool input directly as a dict
        for block in response_body.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == "architecture_review":
                return block["input"]
        raise ValueError("No architecture_review tool call in response")
    if "deepseek" in model_id:
        return response_body["choices"][0]["message"]["content"]
    if "llama" in model_id:
        return response_body["generation"]
    if "nova" in model_id or "amazon" in model_id:
        return response_body["output"]["message"]["content"][0]["text"]
    return response_body["content"][0]["text"]


def strip_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        inner = "\n".join(lines[1:])
        return inner.split("```")[0].strip()
    return t


def repair_json(text: str) -> str | None:
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass
    for i in range(1, 6):
        try:
            candidate = text + "}" * i
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            pass
    for suffix in ["]}", "]}}}}"]:
        try:
            candidate = text + suffix
            json.loads(candidate)
            return candidate
        except json.JSONDecodeError:
            pass
    return None


def invoke_model(user_input: str) -> dict:
    model_id = os.environ.get(
        "AWS_BEDROCK_MODEL_ID",
        "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    )
    client = get_client()
    body = build_request_body(user_input, model_id)

    response = client.invoke_model(
        modelId=model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    response_body = json.loads(response["body"].read().decode("utf-8"))
    result = extract_text(response_body, model_id)

    # Claude with tool_use returns a dict directly — no parsing needed
    if isinstance(result, dict):
        return result

    # Non-Claude models return text — parse it
    cleaned = strip_fences(result)
    repaired = repair_json(cleaned)
    if repaired is None:
        raise ValueError("Model output could not be parsed as JSON")
    return json.loads(repaired)
