"""FastAPI app. Starter stub: only /health exists. Implement POST /recommendations in task 02 (see tasks/02-api.md)."""
from fastapi import FastAPI

app = FastAPI(title="Hotel Recommendation Assistant (fixture API)")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
