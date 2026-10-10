from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Partido
from app.schemas.schemas import PartidoCreate, PartidoCuotasUpdate, PartidoOut

router = APIRouter(prefix="/partidos", tags=["partidos"])


@router.get("/", response_model=list[PartidoOut])
def listar_partidos(
    temporada: str | None = None,
    fecha_num: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Partido)
    if temporada:
        q = q.filter(Partido.temporada == temporada)
    if fecha_num is not None:
        q = q.filter(Partido.fecha_num == fecha_num)
    return q.order_by(Partido.fecha_hora).all()


@router.post("/", response_model=PartidoOut, status_code=201)
def crear_partido(partido: PartidoCreate, db: Session = Depends(get_db)):
    db_partido = Partido(**partido.model_dump())
    db.add(db_partido)
    db.commit()
    db.refresh(db_partido)
    return db_partido


@router.get("/{partido_id}", response_model=PartidoOut)
def obtener_partido(partido_id: int, db: Session = Depends(get_db)):
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return partido


@router.patch("/{partido_id}/cuotas", response_model=PartidoOut)
def actualizar_cuotas(partido_id: int, cuotas: PartidoCuotasUpdate, db: Session = Depends(get_db)):
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    for campo, valor in cuotas.model_dump(exclude_unset=True).items():
        setattr(partido, campo, valor)
    db.commit()
    db.refresh(partido)
    return partido