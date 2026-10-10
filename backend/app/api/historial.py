from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import FechaFactores
from app.schemas.schemas import FechaFactoresCreate, FechaFactoresOut

router = APIRouter(prefix="/historial", tags=["historial"])


@router.get("/fecha-factores", response_model=list[FechaFactoresOut])
def listar_fecha_factores(temporada: str | None = None, db: Session = Depends(get_db)):
    q = db.query(FechaFactores)
    if temporada:
        q = q.filter(FechaFactores.temporada == temporada)
    return q.order_by(FechaFactores.fecha_num).all()


@router.post("/fecha-factores", response_model=FechaFactoresOut, status_code=201)
def guardar_fecha_factores(datos: FechaFactoresCreate, db: Session = Depends(get_db)):
    db_ff = FechaFactores(**datos.model_dump())
    db.add(db_ff)
    db.commit()
    db.refresh(db_ff)
    return db_ff