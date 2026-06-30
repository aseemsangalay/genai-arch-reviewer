from __future__ import annotations
import boto3
import json
import os
from api.prompt import SYSTEM_PROMPT


def get_client():
    return boto3.client(
        "bedrock-runtime",
        region_name=os.environ.get("AWS_DEFAULT_REGION", "us-east-1"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )


def build_request_body(user_input: str, model_id: str) -> dict:
    if "anthropic" in model_id or "claude" in model_id:
        return {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_input}],
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
    # default: claude format
    return {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_input}],
    }


def extract_text(response_body: dict, model_id: str) -> str:
    if "anthropic" in model_id or "claude" in model_id:
        return response_body["content"][0]["text"]
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
    model_id = os.environ.get("AWS_BEDROCK_MODEL_ID", "deepseek.v3.2")
    client = get_client()
    body = build_request_body(user_input, model_id)

    response = client.invoke_model(
        modelId=model_id,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    response_body = json.loads(response["body"].read().decode("utf-8"))
    raw_text = extract_text(response_body, model_id)
    cleaned = strip_fences(raw_text)
    repaired = repair_json(cleaned)

    if repaired is None:
        raise ValueError("Model output could not be parsed as JSON")
    return json.loads(repaired)
