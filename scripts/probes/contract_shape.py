"""Harness probe for task 01: checks the OpenAPI document covers the brief. Usage: python contract_shape.py openapi/openapi.yaml"""
import sys
from pathlib import Path

import yaml
from openapi_spec_validator import validate

failures: list[str] = []


def check(cond: bool, msg: str) -> None:
    print(("  ok   " if cond else "  FAIL ") + msg)
    if not cond:
        failures.append(msg)


def resolve(spec, node):
    while isinstance(node, dict) and "$ref" in node:
        ref = node["$ref"]
        assert ref.startswith("#/"), f"only local refs supported: {ref}"
        node = spec
        for part in ref[2:].split("/"):
            node = node[part]
    return node


def json_schema(spec, op_part):
    return resolve(spec, resolve(spec, op_part).get("content", {}).get("application/json", {}).get("schema", {}))


path = Path(sys.argv[1] if len(sys.argv) > 1 else "openapi/openapi.yaml")
check(path.exists(), f"{path} exists")
if not path.exists():
    sys.exit(1)
spec = yaml.safe_load(path.read_text())
try:
    validate(spec)
    check(True, "document is valid OpenAPI")
except Exception as exc:  # noqa: BLE001
    check(False, f"document is valid OpenAPI ({exc})")
    sys.exit(1)

op = spec.get("paths", {}).get("/recommendations", {}).get("post")
check(op is not None, "POST /recommendations is defined")
if op is None:
    sys.exit(1)

req = json_schema(spec, op.get("requestBody", {}))
props = {k: resolve(spec, v) for k, v in req.get("properties", {}).items()}
check("message" in req.get("required", []), "request: message is required")
msg = props.get("message", {})
check(msg.get("type") == "string" and (msg.get("minLength", 0) >= 1 or "pattern" in msg), "request: message is a non-empty string (minLength>=1 or pattern)")
check(sorted(props.get("scenario", {}).get("enum", [])) == ["empty", "error", "success"], "request: scenario enum is success|empty|error")
check(bool(props.get("scenario", {}).get("description") or spec.get("info", {}).get("description", "").lower().count("scenario")), "scenario documented as a demo control")

responses = op.get("responses", {})
for code in ("200", "422", "503"):
    check(code in responses, f"response {code} declared")
    if code in responses:
        check(bool(json_schema(spec, responses[code])), f"response {code} has a JSON schema")

ok = json_schema(spec, responses.get("200", {}))
ok_props = ok.get("properties", {})
check({"message", "hotels"} <= set(ok.get("required", [])), "200: message and hotels required")
hotel = resolve(spec, resolve(spec, ok_props.get("hotels", {})).get("items", {}))
hp = {k: resolve(spec, v) for k, v in hotel.get("properties", {}).items()}
expected = {"id": "string", "name": "string", "nightlyPrice": "number", "currency": "string", "breakfastIncluded": "boolean", "explanation": "string"}
for field, typ in expected.items():
    check(hp.get(field, {}).get("type") == typ, f"Hotel.{field} is {typ}")
check(set(expected) <= set(hotel.get("required", [])), "Hotel: all six fields required")
check(any(k in ok_props for k in ("source", "fixture", "isFixture")) or "fixture" in str(ok_props.get("message", {})).lower(), "200: response labelled as fixture data")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
