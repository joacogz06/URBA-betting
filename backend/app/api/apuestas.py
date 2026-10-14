from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Apuesta, Config
from app.schemas.schemas import ApuestaCreate, ApuestaResultado, ApuestaOut

router = APIRouter(prefix="/apuestas", tags=["apuestas"])

BANKROLL_KEY = "bankroll_inicial"
BANKROLL_DEFAULT = 1000.0


def liquidar_apuesta(apuesta: Apuesta, gano: bool) -> None:
    """Marca la apuesta como ganada/perdida y calcula la ganancia neta."""
    apuesta.resultado = gano
    if gano:
        # Ganó: ganancia neta = lo que cobró menos lo apostado
        apuesta.ganancia_neta = round(apuesta.stake * apuesta.cuota - apuesta.stake, 2)
    else:
        # Perdió: se pierde el stake
        apuesta.ganancia_neta = -apuesta.stake


def _get_bankroll_inicial(db: Session) -> float:
    row = db.query(Config).filter(Config.clave == BANKROLL_KEY).first()
    return float(row.valor) if row else BANKROLL_DEFAULT


@router.get("/bankroll")
def obtener_bankroll(db: Session = Depends(get_db)):
    bankroll_inicial = _get_bankroll_inicial(db)
    ganancia = db.query(func.sum(Apuesta.ganancia_neta)).filter(Apuesta.ganancia_neta.isnot(None)).scalar() or 0.0
    return {
        "bankroll_inicial": bankroll_inicial,
        "bankroll": round(bankroll_inicial + ganancia, 2),
        "ganancia_total": round(ganancia, 2),
    }


@router.patch("/bankroll")
def actualizar_bankroll(payload: dict, db: Session = Depends(get_db)):
    nuevo = float(payload.get("bankroll_inicial", BANKROLL_DEFAULT))
    row = db.query(Config).filter(Config.clave == BANKROLL_KEY).first()
    if row:
        row.valor = str(nuevo)
    else:
        db.add(Config(clave=BANKROLL_KEY, valor=str(nuevo)))
    db.commit()
    ganancia = db.query(func.sum(Apuesta.ganancia_neta)).filter(Apuesta.ganancia_neta.isnot(None)).scalar() or 0.0
    return {
        "bankroll_inicial": nuevo,
        "bankroll": round(nuevo + ganancia, 2),
        "ganancia_total": round(ganancia, 2),
    }


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
    db_apuesta = Apuesta(
        **apuesta.model_dump(),
        ganancia_neta=-apuesta.stake,   # ← se descuenta al apostar
    )
    db.add(db_apuesta)
    db.commit()
    db.refresh(db_apuesta)
    return db_apuesta


@router.patch("/{apuesta_id}/resultado", response_model=ApuestaOut)
def cargar_resultado(apuesta_id: int, resultado: ApuestaResultado, db: Session = Depends(get_db)):
    apuesta = db.query(Apuesta).filter(Apuesta.id == apuesta_id).first()
    if not apuesta:
        raise HTTPException(status_code=404, detail="Apuesta no encontrada")
    liquidar_apuesta(apuesta, resultado.resultado)
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