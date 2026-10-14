import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Calculo, Factor
from app.schemas.schemas import CalculoCreate, CalculoOut

router = APIRouter(prefix="/calculos", tags=["calculos"])

EDGE_MINIMO = 0.05  # 5% de edge mínimo para considerar que hay valor
K_SENSIBILIDAD = 1.5  # score normalizado ±2 → ~95% / ~5%


def _sigmoide(s: float) -> float:
    return 1.0 / (1.0 + math.exp(-s))


def _calcular_probabilidades(valores: dict, factores: list[Factor]) -> tuple[float, float, dict]:
    pesos_usados = {}
    suma_ponderada = 0.0
    suma_pesos = 0.0

    for f in factores:
        if not f.activo:
            continue
        # Guardamos SIEMPRE el peso: es la configuración de la fecha (sirve para el análisis)
        pesos_usados[f.nombre] = f.peso

        v = valores.get(f.nombre)
        if v is None:
            # N/A: el factor no aplica a este partido → no cuenta ni arriba ni abajo
            continue
        suma_ponderada += v * f.peso
        suma_pesos += f.peso

    # Promedio ponderado: siempre entre -2 y +2, sin importar cuántos factores haya
    score = suma_ponderada / suma_pesos if suma_pesos > 0 else 0.0

    prob_local = round(_sigmoide(score * K_SENSIBILIDAD) * 100, 1)
    prob_local = max(5.0, min(95.0, prob_local))
    prob_visitante = round(100 - prob_local, 1)
    return prob_local, prob_visitante, pesos_usados


def _analisis_casa(prob_local: float, cuota_local: float | None, cuota_visitante: float | None) -> dict | None:
    if not cuota_local:
        return None

    p = prob_local / 100
    p_casa = 1 / cuota_local
    edge_local = p - p_casa

    if abs(edge_local) >= EDGE_MINIMO:
        if edge_local > 0:
            # Apostar al local
            f_kelly = (p * (cuota_local - 1) - (1 - p)) / (cuota_local - 1)
            f_kelly = max(0.0, f_kelly * 0.25)
            return {
                "cuota": cuota_local,
                "prob_casa": round(p_casa * 100, 1),
                "edge": round(edge_local * 100, 1),
                "apostar_a": "local",
                "kelly_fraccion": round(f_kelly, 4),
                "hay_valor": True,
            }
        else:
            # Apostar al visitante
            p_vis = 1 - p
            if cuota_visitante:
                cuota_vis = cuota_visitante
            else:
                p_casa_vis = 1 - p_casa
                cuota_vis = 1 / p_casa_vis if p_casa_vis > 0 else None
            if cuota_vis:
                f_kelly = (p_vis * (cuota_vis - 1) - (1 - p_vis)) / (cuota_vis - 1)
                f_kelly = max(0.0, f_kelly * 0.25)
            else:
                f_kelly = 0.0
            return {
                "cuota": cuota_vis or cuota_local,
                "prob_casa": round((1 / cuota_vis * 100) if cuota_vis else (1 - p_casa) * 100, 1),
                "edge": round(edge_local * 100, 1),
                "apostar_a": "visitante",
                "kelly_fraccion": round(f_kelly, 4),
                "hay_valor": True,
            }
    else:
        return {
            "cuota": cuota_local,
            "prob_casa": round(p_casa * 100, 1),
            "edge": round(edge_local * 100, 1),
            "apostar_a": None,
            "kelly_fraccion": 0.0,
            "hay_valor": False,
        }


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
    from app.models.models import Partido
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

    resultado = {}
    for c in calculos:
        partido = db.query(Partido).filter(Partido.id == c.partido_id).first()
        betsson = _analisis_casa(c.probabilidad_local, partido.cuota_local_betsson if partido else None, partido.cuota_visitante_betsson if partido else None)
        codere = _analisis_casa(c.probabilidad_local, partido.cuota_local_codere if partido else None, partido.cuota_visitante_codere if partido else None)

        # ¿hay valor en alguna casa?
        hay_valor = any(x and x["hay_valor"] for x in [betsson, codere])

        # Mejor casa: la de mayor |edge| con valor
        mejor = None
        casas_con_valor = [(n, x) for n, x in [("betsson", betsson), ("codere", codere)] if x and x["hay_valor"]]
        if casas_con_valor:
            mejor = max(casas_con_valor, key=lambda nc: abs(nc[1]["edge"]))[0]

        resultado[c.partido_id] = {
            "prob_local": c.probabilidad_local,
            "prob_visitante": c.probabilidad_visitante,
            "hay_valor": hay_valor,
            "mejor_casa": mejor,
            "betsson": betsson,
            "codere": codere,
        }

    return resultado


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