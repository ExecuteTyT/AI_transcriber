import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """GET /api/health возвращает 200 и статус ok."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_deep_ok(client: AsyncClient):
    """GET /api/health/deep дёргает БД через ORM — на здоровой схеме 200/db=ok."""
    response = await client.get("/api/health/deep")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}
