from fastapi import APIRouter, HTTPException
from app.services.urba_client import get_posiciones, get_fixture

router = APIRouter(prefix="/urba", tags=["urba"])


@router.get("/posiciones")
async def posiciones():
    try:
        return await get_posiciones()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/fixture")
async def fixture():
    try:
        return await get_fixture()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
