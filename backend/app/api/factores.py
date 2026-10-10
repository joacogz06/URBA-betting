from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Factor
from app.schemas.schemas import FactorCreate, FactorUpdate, FactorOut

router = APIRouter(prefix="/factores", tags=["factores"])


@router.get("/", response_model=list[FactorOut])
def listar_factores(db: Session = Depends(get_db)):
    return db.query(Factor).filter(Factor.activo == True).order_by(Factor.orden).all()


@router.post("/", response_model=FactorOut, status_code=201)
def crear_factor(factor: FactorCreate, db: Session = Depends(get_db)):
    db_factor = Factor(**factor.model_dump())
    db.add(db_factor)
    db.commit()
    db.refresh(db_factor)
    return db_factor


@router.patch("/{factor_id}", response_model=FactorOut)
def actualizar_factor(factor_id: int, datos: FactorUpdate, db: Session = Depends(get_db)):
    factor = db.query(Factor).filter(Factor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=404, detail="Factor no encontrado")
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(factor, campo, valor)
    db.commit()
    db.refresh(factor)
    return factor


@router.delete("/{factor_id}", status_code=204)
def eliminar_factor(factor_id: int, db: Session = Depends(get_db)):
    factor = db.query(Factor).filter(Factor.id == factor_id).first()
    if not factor:
        raise HTTPException(status_code=404, detail="Factor no encontrado")
    factor.activo = False
    db.commit()