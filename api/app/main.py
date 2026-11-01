"""FastAPI app. Starter stub: only /health exists. Implement POST /recommendations in task 02 (see tasks/02-api.md)."""
from pathlib import Path

from fastapi import FastAPI

FIXTURES_CSV = Path(__file__).resolve().parents[1] / "fixtures" / "hotels.csv"

app = FastAPI(title="Hotel Recommendation Assistant (fixture API)")


def load_fixtures(path: Path = FIXTURES_CSV) -> list[dict]:
    """Red stub so the tests load. Not called at import yet. Implemented in the green step."""
    raise NotImplementedError


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
