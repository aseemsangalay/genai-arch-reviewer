from __future__ import annotations
from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Add project root to path so "api" imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.bedrock import invoke_model


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        # Handles CORS preflight — do not modify
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(content_length)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return self._send_json(400, {"error": "Invalid JSON"})

        user_input = data.get("input", "")
        if not isinstance(user_input, str) or not user_input.strip():
            return self._send_json(400, {"error": "input field required (string)"})
        user_input = user_input.strip()
        if len(user_input) < 10:
            return self._send_json(400, {"error": "input too short"})
        if len(user_input) > 5000:
            return self._send_json(400, {"error": "input too long (max 5000 chars)"})

        try:
            result = invoke_model(user_input)
            self._send_json(200, {"result": result})
        except ValueError:
            self._send_json(502, {"error": "Model returned malformed output. Try again."})
        except Exception as e:
            print(f"invoke_model error: {e}")
            self._send_json(500, {"error": "Review failed. Try again."})

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
