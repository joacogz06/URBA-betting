from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Apuesta
from app.schemas.schemas import ApuestaCreate, ApuestaResultado, ApuestaOut

router = APIRouter(prefix="/apuestas", tags=["apuestas"])


@router.get("/", response_model=list[ApuestaOut])
def listar_apuestas(temporada: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Apuesta)
    if temporada:
        q = q.join(Apuesta.partido).filter_by(temporada=temporada)
    return q.order_by(Apuesta.created_at.desc()).all()


@router.post("/", response_model=ApuestaOut, status_code=201)
def registrar_apuesta(apuesta: ApuestaCreate, db: Session = Depends(get_db)):
    existente = db.query(Apuesta).filter(Apuesta.partido_id == apuesta.partido_id).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una apuesta para este partido")
    db_apuesta = Apuesta(**apuesta.model_dump())
    db.add(db_apuesta)
    db.commit()
    db.refresh(db_apuesta)
    return db_apuesta


@router.patch("/{apuesta_id}/resultado", response_model=ApuestaOut)
def cargar_resultado(apuesta_id: int, resultado: ApuestaResultado, db: Session = Depends(get_db)):
    apuesta = db.query(Apuesta).filter(Apuesta.id == apuesta_id).first()
    if not apuesta:
        raise HTTPException(status_code=404, detail="Apuesta no encontrada")
    apuesta.resultado = resultado.resultado
    apuesta.ganancia_neta = resultado.ganancia_neta
    db.commit()
    db.refresh(apuesta)
    return apuesta


@router.delete("/{apuesta_id}", status_code=204)
def eliminar_apuesta(apuesta_id: int, db: Session = Depends(get_db)):
    apuesta = db.query(Apuesta).filter(Apuesta.id == apuesta_id).first()
    if not apuesta:
        raise HTTPException(status_code=404, detail="Apuesta no encontrada")
    db.delete(apuesta)
    db.commit()