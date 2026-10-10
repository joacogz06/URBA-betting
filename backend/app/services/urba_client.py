import httpx
from app.config import settings

BASE = settings.urba_api_base
CHAMP_ID = settings.urba_championship_id


async def get_posiciones() -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE}/api/positions/{CHAMP_ID}", timeout=10)
        r.raise_for_status()
        return r.json()


async def get_fixture() -> list[dict]:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE}/api/championship/{CHAMP_ID}", timeout=10)
        r.raise_for_status()
        return r.json()
