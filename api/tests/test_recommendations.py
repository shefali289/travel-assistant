"""Task 02 acceptance tests: one or more test_ac2_N_ per AC in tasks/02-api.md.

No mocks: every request hits the real app through TestClient. Only FIXTURE_DELAY_MS is configured.
"""
import importlib
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from app import main

API_DIR = Path(__file__).resolve().parents[1]
SPEC = yaml.safe_load((API_DIR.parent / "openapi" / "openapi.yaml").read_text(encoding="utf-8"))
REGISTRY = Registry().with_resource("spec", Resource.opaque(SPEC))
RECOMMENDATIONS = SPEC["paths"]["/recommendations"]["post"]

MSG = "Find a Wellington hotel for two nights, up to NZD 250 per night; breakfast preferred."
LOCAL_ORIGIN = "http://localhost:3000"
OTHER_ORIGIN = "https://other.example"

HOTELS = [
    {"id": "h1", "name": "Harbour House", "nightlyPrice": 220, "currency": "NZD", "breakfastIncluded": True, "explanation": "Within budget; breakfast included."},
    {"id": "h2", "name": "City Garden", "nightlyPrice": 245, "currency": "NZD", "breakfastIncluded": True, "explanation": "Near the meeting district."},
    {"id": "h3", "name": "Quay Rooms", "nightlyPrice": 195, "currency": "NZD", "breakfastIncluded": False, "explanation": "Lower price; breakfast costs extra."},
]
SUCCESS_BODY = {"message": "Here are three hotels to consider.", "hotels": HOTELS, "source": "fixture"}
EMPTY_BODY = {
    "message": "I could not find any hotels for that request. Try changing your request.",
    "hotels": [],
    "source": "fixture",
}
ERROR_BODY = {
    "code": "service_unavailable",
    "message": "Hotel recommendations are unavailable right now. Please try again.",
    "retryable": True,
}

BODY_MESSAGE = "The request body must be JSON with a message field"
UNKNOWN_FIELD_MESSAGE = "Send only message and scenario"
FRAMEWORK_WORDING = ("value error", "input should", "string should", "field required", "extra inputs", "pydantic", "('body'")

INVALID_MESSAGE_PAYLOADS = [
    pytest.param({"scenario": "success"}, id="missing"),
    pytest.param({"message": ""}, id="empty"),
    pytest.param({"message": "   "}, id="spaces"),
    pytest.param({"message": "\t\n"}, id="tab-newline"),
    pytest.param({"message": None}, id="null"),
    pytest.param({"message": 42}, id="number"),
    pytest.param({"message": True}, id="boolean"),
    pytest.param({"message": ["hi"]}, id="list"),
    pytest.param({"message": {"text": "hi"}}, id="object"),
]
INVALID_SCENARIO_PAYLOADS = [
    pytest.param({"message": MSG, "scenario": "nope"}, id="unknown-scenario"),
    pytest.param({"message": MSG, "scenario": None}, id="null-scenario"),
]
UNKNOWN_FIELD_PAYLOAD = {"message": MSG, "hiddenField": 1}
UNREADABLE_BODIES = [
    pytest.param(b"not json", id="non-json"),
    pytest.param(b'{"message": "caf\xff"}', id="invalid-utf8"),
    pytest.param(b"", id="no-body"),
    pytest.param(b"[]", id="empty-array"),
    pytest.param(b'[{"message": "hi"}]', id="array-of-object"),
]
REJECTED_JSON_PAYLOADS = [
    *INVALID_MESSAGE_PAYLOADS,
    pytest.param({"message": "x" * 501}, id="over-500-chars"),
    *INVALID_SCENARIO_PAYLOADS,
    pytest.param(UNKNOWN_FIELD_PAYLOAD, id="unknown-field"),
    pytest.param([], id="empty-array"),
    pytest.param([{"message": "hi"}], id="array-of-object"),
]


@pytest.fixture(autouse=True)
def no_delay(monkeypatch):
    monkeypatch.setenv("FIXTURE_DELAY_MS", "0")


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def client_with_origins(monkeypatch):
    """CORS is set up at import, so an env override needs a reload. Restores the module afterwards."""

    def build(origins):
        if origins is None:
            monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
        else:
            monkeypatch.setenv("ALLOWED_ORIGINS", origins)
        return TestClient(importlib.reload(main).app)

    yield build
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    importlib.reload(main)


def post_json(client, payload):
    return client.post("/recommendations", json=payload)


def post_raw(client, content, content_type="application/json"):
    return client.post("/recommendations", content=content, headers={"Content-Type": content_type})


def preflight(client, origin=LOCAL_ORIGIN, method="POST", headers="content-type"):
    return client.options(
        "/recommendations",
        headers={"Origin": origin, "Access-Control-Request-Method": method, "Access-Control-Request-Headers": headers},
    )


def assert_exact(actual, expected):
    """Equality plus JSON types, because 220 == 220.0 and True == 1 in Python."""
    assert actual == expected
    assert json.dumps(actual, sort_keys=True) == json.dumps(expected, sort_keys=True)


def assert_validation_error(response):
    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"code", "message", "retryable"}
    assert body["code"] == "validation_error"
    assert body["retryable"] is False
    assert isinstance(body["message"], str) and body["message"]
    assert not [word for word in FRAMEWORK_WORDING if word in body["message"].lower()]
    return body["message"]


def schema_errors(schema, instance):
    if "$ref" in schema:
        schema = {"$ref": "spec" + schema["$ref"]}
    return [e.message for e in Draft202012Validator(schema, registry=REGISTRY).iter_errors(instance)]


def response_schema_errors(response):
    declared = RECOMMENDATIONS["responses"].get(str(response.status_code))
    assert declared is not None, f"status {response.status_code} is not declared in the contract"
    return schema_errors(declared["content"]["application/json"]["schema"], response.json())


def copy_app(tmp_path, csv_text=None):
    """A copy of the app with the same layout, so a real import reads this CSV from a path based on __file__."""
    shutil.copytree(API_DIR / "app", tmp_path / "app", ignore=shutil.ignore_patterns("__pycache__"))
    (tmp_path / "fixtures").mkdir()
    source = (API_DIR / "fixtures" / "hotels.csv").read_text(encoding="utf-8")
    (tmp_path / "fixtures" / "hotels.csv").write_text(csv_text if csv_text is not None else source, encoding="utf-8")
    return tmp_path


def run_python(code, cwd, unset=()):
    env = {k: v for k, v in os.environ.items() if k not in unset}
    return subprocess.run([sys.executable, "-c", code], cwd=cwd, env=env, capture_output=True, text=True, timeout=60)


def csv_with(price="220", breakfast="true"):
    return (
        "id,name,nightlyPrice,currency,breakfastIncluded,explanation\n"
        f"h1,Harbour House,{price},NZD,{breakfast},Within budget.\n"
    )


# AC2.1: fixture parsing


def test_ac2_1_load_fixtures_parses_csv_with_exact_values_and_types():
    assert_exact(main.load_fixtures(), HOTELS)


def test_ac2_1_load_fixtures_finds_the_csv_from_any_working_directory(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert_exact(main.load_fixtures(), HOTELS)


@pytest.mark.parametrize(("price", "expected"), [("220", 220), ("219.5", 219.5)])
def test_ac2_1_whole_prices_stay_integers_and_others_stay_decimal(tmp_path, price, expected):
    path = tmp_path / "hotels.csv"
    path.write_text(csv_with(price=price), encoding="utf-8")
    parsed = main.load_fixtures(path)[0]["nightlyPrice"]
    assert parsed == expected
    assert type(parsed) is type(expected)


@pytest.mark.parametrize(("breakfast", "expected"), [("true", True), ("false", False)])
def test_ac2_1_true_and_false_become_booleans(tmp_path, breakfast, expected):
    path = tmp_path / "hotels.csv"
    path.write_text(csv_with(breakfast=breakfast), encoding="utf-8")
    assert main.load_fixtures(path)[0]["breakfastIncluded"] is expected


@pytest.mark.parametrize("breakfast", ["yes", "1", "", "True", "FALSE"])
def test_ac2_1_invalid_boolean_raises(tmp_path, breakfast):
    path = tmp_path / "hotels.csv"
    path.write_text(csv_with(breakfast=breakfast), encoding="utf-8")
    with pytest.raises(ValueError):
        main.load_fixtures(path)


@pytest.mark.parametrize("price", ["abc", "", "nan", "inf", "-inf"])
def test_ac2_1_non_numeric_nan_or_inf_price_raises(tmp_path, price):
    path = tmp_path / "hotels.csv"
    path.write_text(csv_with(price=price), encoding="utf-8")
    with pytest.raises(ValueError):
        main.load_fixtures(path)


@pytest.mark.parametrize(
    "bad_csv",
    [pytest.param(csv_with(breakfast="yes"), id="bad-boolean"), pytest.param(csv_with(price="nan"), id="bad-price")],
)
def test_ac2_1_bad_fixture_data_stops_the_app_importing(tmp_path, bad_csv):
    good = copy_app(tmp_path / "good")
    control = run_python("import app.main", good)
    assert control.returncode == 0, control.stderr

    bad = copy_app(tmp_path / "bad", bad_csv)
    result = run_python("import app.main", bad)
    assert result.returncode != 0
    assert "ValueError" in result.stderr


# AC2.2: invalid message


@pytest.mark.parametrize("payload", INVALID_MESSAGE_PAYLOADS)
def test_ac2_2_invalid_message_returns_422_naming_the_field(client, payload):
    assert "message" in assert_validation_error(post_json(client, payload))


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"message": "", "scenario": "nope"}, id="message-and-scenario"),
        pytest.param({"scenario": "nope"}, id="missing-message-and-scenario"),
        pytest.param({"message": "", "scenario": "nope", "hiddenField": 1}, id="message-scenario-and-unknown-field"),
    ],
)
def test_ac2_2_several_errors_report_only_the_first(client, payload):
    text = assert_validation_error(post_json(client, payload))
    assert "message" in text
    assert "scenario" not in text
    assert "hiddenField" not in text


# AC2.3 to AC2.6: the scenarios


def test_ac2_3_success_returns_exactly_the_three_fixtures(client):
    response = post_json(client, {"message": MSG, "scenario": "success"})
    assert response.status_code == 200
    assert_exact(response.json(), SUCCESS_BODY)


def test_ac2_4_no_scenario_is_treated_as_success(client):
    response = post_json(client, {"message": MSG})
    assert response.status_code == 200
    assert_exact(response.json(), SUCCESS_BODY)


def test_ac2_5_empty_scenario_returns_no_hotels(client):
    response = post_json(client, {"message": MSG, "scenario": "empty"})
    assert response.status_code == 200
    assert_exact(response.json(), EMPTY_BODY)


def test_ac2_6_error_scenario_returns_retryable_503(client):
    response = post_json(client, {"message": MSG, "scenario": "error"})
    assert response.status_code == 503
    assert_exact(response.json(), ERROR_BODY)


# AC2.7: other invalid requests


@pytest.mark.parametrize("payload", INVALID_SCENARIO_PAYLOADS)
def test_ac2_7_unknown_or_null_scenario_returns_422_naming_scenario(client, payload):
    assert "scenario" in assert_validation_error(post_json(client, payload))


def test_ac2_7_unknown_field_returns_422_without_echoing_it(client):
    assert assert_validation_error(post_json(client, UNKNOWN_FIELD_PAYLOAD)) == UNKNOWN_FIELD_MESSAGE


def test_ac2_7_message_over_500_characters_returns_422(client):
    assert "message" in assert_validation_error(post_json(client, {"message": "x" * 501}))


def test_ac2_7_message_of_exactly_500_characters_is_accepted(client):
    response = post_json(client, {"message": "x" * 500})
    assert response.status_code == 200
    assert_exact(response.json(), SUCCESS_BODY)


@pytest.mark.parametrize("content", UNREADABLE_BODIES)
def test_ac2_7_unreadable_body_returns_422_with_plain_message(client, content):
    assert assert_validation_error(post_raw(client, content)) == BODY_MESSAGE


def test_ac2_7_request_with_no_body_or_content_type_returns_422(client):
    assert assert_validation_error(client.post("/recommendations")) == BODY_MESSAGE


@pytest.mark.parametrize("scenario", ["success", "empty", "error"])
def test_ac2_7_validation_runs_before_the_scenario(client, scenario):
    assert "message" in assert_validation_error(post_json(client, {"message": "", "scenario": scenario}))


# AC2.8: responses and rejected payloads against the YAML


@pytest.mark.parametrize(
    ("scenario", "status"),
    [("success", 200), ("empty", 200), ("error", 503)],
)
def test_ac2_8_scenario_responses_match_the_contract(client, scenario, status):
    response = post_json(client, {"message": MSG, "scenario": scenario})
    assert response.status_code == status
    assert response_schema_errors(response) == []


@pytest.mark.parametrize("payload", REJECTED_JSON_PAYLOADS)
def test_ac2_8_rejected_json_responses_match_the_contract(client, payload):
    response = post_json(client, payload)
    assert response.status_code == 422
    assert response_schema_errors(response) == []


@pytest.mark.parametrize("content", UNREADABLE_BODIES)
def test_ac2_8_unreadable_body_responses_match_the_contract(client, content):
    response = post_raw(client, content)
    assert response.status_code == 422
    assert response_schema_errors(response) == []


def test_ac2_8_health_response_matches_the_contract(client):
    response = client.get("/health")
    assert response.status_code == 200
    schema = SPEC["paths"]["/health"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert schema_errors(schema, response.json()) == []


@pytest.mark.parametrize("payload", REJECTED_JSON_PAYLOADS)
def test_ac2_8_rejected_payloads_also_fail_the_contract_request_schema(payload):
    assert schema_errors({"$ref": "#/components/schemas/RecommendationRequest"}, payload) != []


# AC2.9: the delay


@pytest.mark.parametrize(("scenario", "status"), [("success", 200), ("empty", 200), ("error", 503)])
def test_ac2_9_every_scenario_waits_for_the_configured_delay(client, monkeypatch, scenario, status):
    monkeypatch.setenv("FIXTURE_DELAY_MS", "100")
    started = time.perf_counter()
    response = post_json(client, {"message": MSG, "scenario": scenario})
    elapsed = time.perf_counter() - started
    assert response.status_code == status
    assert 0.09 <= elapsed < 0.7


def test_ac2_9_delay_is_read_on_each_request(client, monkeypatch):
    monkeypatch.setenv("FIXTURE_DELAY_MS", "400")
    started = time.perf_counter()
    assert post_json(client, {"message": MSG}).status_code == 200
    assert time.perf_counter() - started >= 0.38

    monkeypatch.setenv("FIXTURE_DELAY_MS", "0")
    started = time.perf_counter()
    assert post_json(client, {"message": MSG}).status_code == 200
    assert time.perf_counter() - started < 0.3


def test_ac2_9_default_delay_is_800ms_when_unset(client, monkeypatch):
    monkeypatch.delenv("FIXTURE_DELAY_MS")
    started = time.perf_counter()
    response = post_json(client, {"message": MSG})
    elapsed = time.perf_counter() - started
    assert response.status_code == 200
    assert 0.78 <= elapsed < 1.6


@pytest.mark.parametrize("value", ["abc", "", "-1"])
def test_ac2_9_non_numeric_or_negative_delay_falls_back_to_800ms(client, monkeypatch, value):
    monkeypatch.setenv("FIXTURE_DELAY_MS", value)
    started = time.perf_counter()
    response = post_json(client, {"message": MSG})
    elapsed = time.perf_counter() - started
    assert response.status_code == 200
    assert 0.78 <= elapsed < 1.6


@pytest.mark.parametrize(
    "send",
    [
        pytest.param(lambda c: post_json(c, {"message": ""}), id="blank-message"),
        pytest.param(lambda c: post_raw(c, b"not json"), id="non-json"),
    ],
)
def test_ac2_9_a_422_returns_without_waiting(client, monkeypatch, send):
    monkeypatch.setenv("FIXTURE_DELAY_MS", "2000")
    started = time.perf_counter()
    response = send(client)
    elapsed = time.perf_counter() - started
    assert response.status_code == 422
    assert elapsed < 1.0


# AC2.10: CORS


def test_ac2_10_preflight_allows_the_default_origin_for_post_with_content_type(client_with_origins):
    response = preflight(client_with_origins(None))
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == LOCAL_ORIGIN
    assert "POST" in response.headers.get("access-control-allow-methods", "")
    assert "content-type" in response.headers.get("access-control-allow-headers", "").lower()


@pytest.mark.parametrize("origin", ["https://a.example", "https://b.example"])
def test_ac2_10_allowed_origins_are_comma_separated_with_spaces_trimmed(client_with_origins, origin):
    client = client_with_origins(" https://a.example , https://b.example ")
    assert preflight(client, origin=origin).headers.get("access-control-allow-origin") == origin


def test_ac2_10_setting_allowed_origins_replaces_the_default(client_with_origins):
    client = client_with_origins("https://a.example")
    assert preflight(client, origin="https://a.example").headers.get("access-control-allow-origin") == "https://a.example"
    assert "access-control-allow-origin" not in preflight(client, origin=LOCAL_ORIGIN).headers


def test_ac2_10_other_origins_are_refused(client_with_origins):
    client = client_with_origins(None)
    assert preflight(client).headers.get("access-control-allow-origin") == LOCAL_ORIGIN
    assert "access-control-allow-origin" not in preflight(client, origin=OTHER_ORIGIN).headers

    allowed = client.post("/recommendations", json={"message": MSG}, headers={"Origin": LOCAL_ORIGIN})
    assert allowed.headers.get("access-control-allow-origin") == LOCAL_ORIGIN
    refused = client.post("/recommendations", json={"message": MSG}, headers={"Origin": OTHER_ORIGIN})
    assert "access-control-allow-origin" not in refused.headers


@pytest.mark.parametrize("method", ["GET", "PUT", "DELETE"])
def test_ac2_10_only_post_is_allowed(client_with_origins, method):
    client = client_with_origins(None)
    assert "POST" in preflight(client).headers.get("access-control-allow-methods", "")
    response = preflight(client, method=method)
    assert method not in response.headers.get("access-control-allow-methods", "")


@pytest.mark.parametrize("header", ["authorization", "x-custom"])
def test_ac2_10_only_content_type_is_allowed_as_a_header(client_with_origins, header):
    client = client_with_origins(None)
    assert "content-type" in preflight(client).headers.get("access-control-allow-headers", "").lower()
    response = preflight(client, headers=header)
    assert header not in response.headers.get("access-control-allow-headers", "").lower()


def test_ac2_10_credentials_are_not_allowed(client_with_origins):
    client = client_with_origins(None)
    before = preflight(client)
    assert before.headers.get("access-control-allow-origin") == LOCAL_ORIGIN
    assert "access-control-allow-credentials" not in before.headers
    response = client.post("/recommendations", json={"message": MSG}, headers={"Origin": LOCAL_ORIGIN})
    assert response.headers.get("access-control-allow-origin") == LOCAL_ORIGIN
    assert "access-control-allow-credentials" not in response.headers


@pytest.mark.parametrize(
    ("payload", "status"),
    [
        pytest.param({"message": ""}, 422, id="422"),
        pytest.param({"message": MSG, "scenario": "error"}, 503, id="503"),
    ],
)
def test_ac2_10_error_responses_carry_the_allow_origin_header(client_with_origins, payload, status):
    response = client_with_origins(None).post("/recommendations", json=payload, headers={"Origin": LOCAL_ORIGIN})
    assert response.status_code == status
    assert response.headers.get("access-control-allow-origin") == LOCAL_ORIGIN


def test_ac2_10_unreadable_body_422_carries_the_allow_origin_header(client_with_origins):
    response = client_with_origins(None).post(
        "/recommendations",
        content=b'{"message": "caf\xff"}',
        headers={"Origin": LOCAL_ORIGIN, "Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert response.headers.get("access-control-allow-origin") == LOCAL_ORIGIN


def test_ac2_10_only_real_environment_variables_are_read(tmp_path):
    app_dir = copy_app(tmp_path)
    (app_dir / ".env").write_text("ALLOWED_ORIGINS=https://from-dotenv.example\n", encoding="utf-8")
    code = (
        "import json\n"
        "from fastapi.testclient import TestClient\n"
        "from app.main import app\n"
        "client = TestClient(app)\n"
        "seen = {}\n"
        "for origin in ('http://localhost:3000', 'https://from-dotenv.example'):\n"
        "    r = client.options('/recommendations', headers={'Origin': origin, 'Access-Control-Request-Method': 'POST'})\n"
        "    seen[origin] = r.headers.get('access-control-allow-origin')\n"
        "print(json.dumps(seen))\n"
    )
    result = run_python(code, app_dir, unset=("ALLOWED_ORIGINS",))
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == {LOCAL_ORIGIN: LOCAL_ORIGIN, "https://from-dotenv.example": None}


# AC2.11: generated docs off


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_ac2_11_generated_docs_routes_are_off(client, path):
    assert client.get(path).status_code == 404
