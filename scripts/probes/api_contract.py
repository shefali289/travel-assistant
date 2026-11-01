"""Harness probe for task 02: runs the real FastAPI app in-process and checks behaviour against
the brief AND against the response schemas in openapi/openapi.yaml. Independent of your own tests.
Usage (from repo root): python scripts/probes/api_contract.py"""
import os
import sys
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[2]
os.environ["FIXTURE_DELAY_MS"] = "0"
sys.path.insert(0, str(ROOT / "api"))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

SPEC = yaml.safe_load((ROOT / "openapi" / "openapi.yaml").read_text())
OP = SPEC["paths"]["/recommendations"]["post"]
REGISTRY = Registry().with_resource("spec", Resource.opaque(SPEC))
client = TestClient(app)
failures: list[str] = []
MSG = "Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred."
FIXTURES = [
    {"id": "h1", "name": "Harbour House", "nightlyPrice": 220, "currency": "NZD", "breakfastIncluded": True, "explanation": "Within budget; breakfast included."},
    {"id": "h2", "name": "City Garden", "nightlyPrice": 245, "currency": "NZD", "breakfastIncluded": True, "explanation": "Near the meeting district."},
    {"id": "h3", "name": "Quay Rooms", "nightlyPrice": 195, "currency": "NZD", "breakfastIncluded": False, "explanation": "Lower price; breakfast costs extra."},
]


def check(cond, msg):
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def matches_spec(status: int, body) -> list[str]:
    resp = OP["responses"].get(str(status))
    if resp is None:
        return [f"status {status} not declared in spec"]
    while "$ref" in resp:
        resp = SPEC
        for p in OP["responses"][str(status)]["$ref"][2:].split("/"):
            resp = resp[p]
    schema = resp["content"]["application/json"]["schema"]
    schema = {"$ref": "spec#" + schema["$ref"][1:]} if "$ref" in schema else schema
    return [e.message for e in Draft202012Validator(schema, registry=REGISTRY).iter_errors(body)]


def post(payload=None, **kw):
    r = client.post("/recommendations", json=payload, **kw) if payload is not None else client.post("/recommendations", **kw)
    try:
        body = r.json()
    except ValueError:
        body = None
    return r.status_code, body


s, b = post({"message": MSG, "scenario": "success"})
check(s == 200, "success -> 200")
check(isinstance(b, dict) and b.get("hotels") == FIXTURES, "success -> exactly the three fixtures with correct types")
check(isinstance(b, dict) and bool(b.get("message")), "success -> non-empty assistant message")
check(not matches_spec(s, b), f"success body matches spec {matches_spec(s, b)}")

s, b = post({"message": MSG, "scenario": "empty"})
check(s == 200 and isinstance(b, dict) and b.get("hotels") == [] and bool(b.get("message")), "empty -> 200 with hotels: [] and a message")
check(not matches_spec(s, b), f"empty body matches spec {matches_spec(s, b)}")

s, b = post({"message": MSG, "scenario": "error"})
check(s == 503, "error -> 503")
check(isinstance(b, dict) and len(str(b)) > 20, "error -> body with a useful message")
check(not matches_spec(s, b), f"503 body matches spec {matches_spec(s, b)}")

for name, payload in {
    "missing message": {"scenario": "success"},
    "empty message": {"message": ""},
    "whitespace message": {"message": "   "},
    "non-string message": {"message": 42},
    "unknown scenario": {"message": MSG, "scenario": "nope"},
}.items():
    s, b = post(payload)
    check(s == 422, f"{name} -> 422")
    check(not matches_spec(s, b), f"{name} body matches spec {matches_spec(s, b)}")

s, b = post(content=b"not json", headers={"Content-Type": "application/json"})
check(s == 422, "non-JSON body -> 422")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
