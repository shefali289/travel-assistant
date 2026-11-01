"""Fixture API for the hotel assistant. openapi/openapi.yaml is the contract."""
import asyncio
import csv
import math
import os
from enum import Enum
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, StrictStr, field_validator
from starlette.exceptions import HTTPException

FIXTURES_CSV = Path(__file__).resolve().parents[1] / "fixtures" / "hotels.csv"
DEFAULT_ORIGINS = "http://localhost:3000"
DEFAULT_DELAY_MS = 800.0

SUCCESS_MESSAGE = "Here are three hotels to consider."
EMPTY_MESSAGE = "I could not find any hotels for that request. Try changing your request."
UNAVAILABLE_MESSAGE = "Hotel recommendations are unavailable right now. Please try again."

BODY_ERROR = "The request body must be JSON with a message field"
UNKNOWN_FIELD_ERROR = "Send only message and scenario"
SCENARIO_ERROR = "The scenario field must be success, empty or error."
MESSAGE_NOT_TEXT_ERROR = "The message field must be text. Describe the hotel you need."
MESSAGE_ERRORS = {
    "missing": "The message field is required. Describe the hotel you need.",
    "value_error": "The message field must not be blank. Describe the hotel you need.",
    "string_too_long": "The message field must be 500 characters or fewer.",
}


class Scenario(str, Enum):
    success = "success"
    empty = "empty"
    error = "error"


class RecommendationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: StrictStr = Field(max_length=500)
    scenario: Scenario = Scenario.success

    @field_validator("message")
    @classmethod
    def message_is_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("blank")
        return value


def parse_price(raw: str) -> int | float:
    price = float(raw)
    if not math.isfinite(price):
        raise ValueError(f"Invalid nightlyPrice in fixtures: {raw!r}")
    return int(price) if price.is_integer() else price


def parse_breakfast(raw: str) -> bool:
    if raw not in ("true", "false"):
        raise ValueError(f"Invalid breakfastIncluded in fixtures: {raw!r}")
    return raw == "true"


def load_fixtures(path: Path = FIXTURES_CSV) -> list[dict]:
    """Read the hotels from the CSV. Raises ValueError on bad data."""
    with open(path, encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    hotels = []
    for row in rows:
        if None in row.values():
            raise ValueError(f"Fixture row has missing columns: {row}")
        hotels.append(
            {
                "id": row["id"],
                "name": row["name"],
                "nightlyPrice": parse_price(row["nightlyPrice"]),
                "currency": row["currency"],
                "breakfastIncluded": parse_breakfast(row["breakfastIncluded"]),
                "explanation": row["explanation"],
            }
        )
    return hotels


def allowed_origins() -> list[str]:
    origins = os.environ.get("ALLOWED_ORIGINS", DEFAULT_ORIGINS).split(",")
    return [origin.strip() for origin in origins if origin.strip()]


def delay_seconds() -> float:
    """FIXTURE_DELAY_MS, read on each request. Anything but a finite, non-negative number means the default."""
    try:
        delay_ms = float(os.environ.get("FIXTURE_DELAY_MS", DEFAULT_DELAY_MS))
    except ValueError:
        delay_ms = DEFAULT_DELAY_MS
    if not math.isfinite(delay_ms) or delay_ms < 0:
        delay_ms = DEFAULT_DELAY_MS
    return delay_ms / 1000


def error_response(status_code: int, code: str, message: str, retryable: bool) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"code": code, "message": message, "retryable": retryable})


def validation_error_response(message: str) -> JSONResponse:
    return error_response(422, "validation_error", message, retryable=False)


def first_error_message(errors: list[dict]) -> str:
    """Plain wording for the first error in field order: message, scenario, then unknown fields."""
    by_field = {
        error["loc"][1]: error["type"]
        for error in errors
        if len(error["loc"]) > 1 and error["type"] not in ("json_invalid", "extra_forbidden")
    }
    if "message" in by_field:
        return MESSAGE_ERRORS.get(by_field["message"], MESSAGE_NOT_TEXT_ERROR)
    if "scenario" in by_field:
        return SCENARIO_ERROR
    if any(error["type"] == "extra_forbidden" for error in errors):
        return UNKNOWN_FIELD_ERROR
    return BODY_ERROR


HOTELS = load_fixtures()

# The generated docs are off so that openapi/openapi.yaml is the only contract.
app = FastAPI(title="Hotel Recommendation Assistant (fixture API)", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    return validation_error_response(first_error_message(exc.errors()))


@app.exception_handler(HTTPException)
async def handle_http_exception(request: Request, exc: HTTPException) -> Response:
    # FastAPI raises a 400 before validation when it cannot decode the body, for example invalid UTF-8.
    if exc.status_code == 400:
        return validation_error_response(BODY_ERROR)
    return await http_exception_handler(request, exc)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recommendations")
async def create_recommendations(request: RecommendationRequest):
    await asyncio.sleep(delay_seconds())
    if request.scenario is Scenario.error:
        return error_response(503, "service_unavailable", UNAVAILABLE_MESSAGE, retryable=True)
    if request.scenario is Scenario.empty:
        return {"message": EMPTY_MESSAGE, "hotels": [], "source": "fixture"}
    return {"message": SUCCESS_MESSAGE, "hotels": HOTELS, "source": "fixture"}
