from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Calculo, Factor
from app.schemas.schemas import CalculoCreate, CalculoOut

router = APIRouter(prefix="/calculos", tags=["calculos"])


@router.post("/", response_model=CalculoOut, status_code=201)
def crear_calculo(calculo: CalculoCreate, db: Session = Depends(get_db)):
    db_calculo = Calculo(**calculo.model_dump())
    db.add(db_calculo)
    db.commit()
    db.refresh(db_calculo)
    return db_calculo


@router.get("/partido/{partido_id}", response_model=list[CalculoOut])
def calculos_por_partido(partido_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Calculo)
        .filter(Calculo.partido_id == partido_id)
        .order_by(Calculo.created_at.desc())
        .all()
    )


@router.get("/{calculo_id}", response_model=CalculoOut)
def obtener_calculo(calculo_id: int, db: Session = Depends(get_db)):
    calculo = db.query(Calculo).filter(Calculo.id == calculo_id).first()
    if not calculo:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")
    return calculo