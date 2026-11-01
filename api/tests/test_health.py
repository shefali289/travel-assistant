from fastapi.testclient import TestClient

from app.main import app


def test_health_toolchain_runs():
    assert TestClient(app).get("/health").json() == {"status": "ok"}
