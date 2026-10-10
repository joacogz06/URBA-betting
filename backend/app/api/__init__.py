from fastapi import APIRouter
from app.api import factores, partidos, calculos, apuestas, historial

api_router = APIRouter(prefix="/api")
api_router.include_router(factores.router)
api_router.include_router(partidos.router)
api_router.include_router(calculos.router)
api_router.include_router(apuestas.router)
api_router.include_router(historial.router)