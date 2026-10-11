from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Calculo, Factor
from app.schemas.schemas import CalculoCreate, CalculoOut

router = APIRouter(prefix="/calculos", tags=["calculos"])


def _calcular_probabilidades(valores: dict, factores: list[Factor]) -> tuple[float, float, dict]:
    """
    Convierte valores (-2 a 2) en probabilidad local usando pesos.
    Retorna (prob_local, prob_visitante, pesos_usados).
    """
    pesos_usados = {}
    score = 0.0
    suma_pesos = 0.0

    for f in factores:
        if not f.activo:
            continue
        v = valores.get(f.nombre, 0)
        score += v * f.peso
        suma_pesos += f.peso
        pesos_usados[f.nombre] = f.peso

    # Normalizar: score va de -2*suma_pesos a +2*suma_pesos
    # Convertir a probabilidad entre 5% y 95%
    if suma_pesos == 0:
        prob_local = 50.0
    else:
        ratio = score / (2 * suma_pesos)  # -1 a 1
        prob_local = round(50 + ratio * 45, 1)  # 5% a 95%
        prob_local = max(5.0, min(95.0, prob_local))

    prob_visitante = round(100 - prob_local, 1)
    return prob_local, prob_visitante, pesos_usados


@router.post("/", response_model=CalculoOut, status_code=201)
def crear_calculo(calculo: CalculoCreate, db: Session = Depends(get_db)):
    factores = db.query(Factor).filter(Factor.activo == True).all()
    if not factores:
        raise HTTPException(status_code=400, detail="No hay factores activos cargados")

    prob_local, prob_visitante, pesos_usados = _calcular_probabilidades(
        calculo.valores_factores, factores
    )

    db_calculo = Calculo(
        partido_id=calculo.partido_id,
        probabilidad_local=prob_local,
        probabilidad_visitante=prob_visitante,
        valores_factores=calculo.valores_factores,
        pesos_factores=pesos_usados,
    )
    db.add(db_calculo)
    db.commit()
    db.refresh(db_calculo)
    return db_calculo


@router.get("/ultimos")
def ultimos_calculos(db: Session = Depends(get_db)):
    subq = (
        db.query(Calculo.partido_id, func.max(Calculo.created_at).label("max_ts"))
        .group_by(Calculo.partido_id)
        .subquery()
    )
    calculos = (
        db.query(Calculo)
        .join(subq, (Calculo.partido_id == subq.c.partido_id) & (Calculo.created_at == subq.c.max_ts))
        .all()
    )
    return {c.partido_id: {"prob_local": c.probabilidad_local, "prob_visitante": c.probabilidad_visitante} for c in calculos}


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