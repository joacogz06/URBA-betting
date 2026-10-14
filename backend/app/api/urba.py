from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Partido
from app.api.apuestas import liquidar_apuesta
from app.services.urba_client import get_posiciones, get_fixture
from app.config import settings
import re
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/urba", tags=["urba"])


def _to_int(valor) -> int | None:
    """URBA puede mandar el score como número o como texto: lo normalizamos a int."""
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def _get_sabado_referencia() -> datetime:
    """
    Devuelve el sábado de referencia para mostrar en Inicio:
    - Si hoy es sábado o domingo → el sábado de este fin de semana
    - Si hoy es lunes a viernes → el próximo sábado
    Todo en UTC-3 (Buenos Aires).
    """
    tz_ba = timezone(timedelta(hours=-3))
    hoy = datetime.now(tz_ba)
    weekday = hoy.weekday()  # 0=lunes, 5=sábado, 6=domingo

    if weekday == 5:        # sábado
        delta = 0
    elif weekday == 6:      # domingo
        delta = -1
    else:                   # lunes(0) a viernes(4)
        delta = 5 - weekday  # días hasta el próximo sábado

    sabado = hoy + timedelta(days=delta)
    return sabado.replace(hour=0, minute=0, second=0, microsecond=0)


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


@router.get("/fecha-actual")
def fecha_actual(db: Session = Depends(get_db)):
    """
    Devuelve el fecha_num de la fecha activa:
    - Sábado/domingo → la fecha cuyo sábado es este fin de semana
    - Lunes-viernes  → la fecha cuyo sábado es el próximo
    Busca el partido en la DB cuya fecha_hora cae en ese sábado.
    """
    sabado = _get_sabado_referencia()
    sabado_siguiente = sabado + timedelta(days=1)  # hasta el domingo inclusive como límite

    # Buscar partidos cuya fecha_hora esté en la semana del sábado de referencia
    # (entre lunes de esa semana y el domingo)
    lunes = sabado - timedelta(days=5)

    partido = (
        db.query(Partido)
        .filter(Partido.fecha_hora >= lunes)
        .filter(Partido.fecha_hora <= sabado_siguiente)
        .order_by(Partido.fecha_hora)
        .first()
    )

    if partido:
        return {"fecha_num": partido.fecha_num, "sabado": sabado.date().isoformat()}

    # Fallback: la fecha más próxima futura
    partido_futuro = (
        db.query(Partido)
        .filter(Partido.fecha_hora >= sabado)
        .order_by(Partido.fecha_hora)
        .first()
    )
    if partido_futuro:
        return {"fecha_num": partido_futuro.fecha_num, "sabado": sabado.date().isoformat()}

    return {"fecha_num": None, "sabado": sabado.date().isoformat()}


@router.post("/sync-fixture")
async def sync_fixture(db: Session = Depends(get_db)):
    """
    Llama a la API de URBA, recorre rounds y matches,
    e inserta/actualiza los partidos en la DB local.
    Además liquida las apuestas pendientes de los partidos ya jugados.
    """
    try:
        data = await get_fixture()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al llamar URBA API: {e}")

    championship = data.get("championship", [])
    if not championship:
        raise HTTPException(status_code=502, detail="Respuesta de URBA sin datos de championship")

    rounds = championship[0].get("rounds") or []
    temporada = str(settings.urba_season_id)

    creados = 0
    actualizados = 0
    liquidadas = 0

    for ronda in rounds:
        round_name: str = ronda.get("name", "")
        match_num = re.search(r"\d+", round_name)
        if not match_num:
            continue
        fecha_num = int(match_num.group())

        matches = ronda.get("matches") or []
        for m in matches:
            urba_id = str(m.get("id"))
            local_name = (m.get("local_team") or {}).get("name") or \
                         (m.get("local_team") or {}).get("club", {}).get("name") or "?"
            visit_name = (m.get("visit_team") or {}).get("name") or \
                         (m.get("visit_team") or {}).get("club", {}).get("name") or "?"

            playdate_str = m.get("playdate")
            fecha_hora = None
            if playdate_str:
                try:
                    fecha_hora = datetime.fromisoformat(playdate_str.replace("Z", "+00:00"))
                except Exception:
                    pass

            fulfilled: bool = m.get("fulfilled", False)
            score_local = _to_int(m.get("local_team_score")) if fulfilled else None
            score_visit = _to_int(m.get("visit_team_score")) if fulfilled else None

            existing = db.query(Partido).filter(Partido.urba_id == urba_id).first()
            if existing:
                existing.jugado = fulfilled
                existing.score_local = score_local
                existing.score_visitante = score_visit
                if fecha_hora:
                    existing.fecha_hora = fecha_hora
                actualizados += 1

                # Liquidar apuesta pendiente si el partido ya se jugó.
                # El empate cuenta como perdida para cualquier lado (no se modela).
                apuesta = existing.apuesta
                if (
                    apuesta is not None
                    and apuesta.resultado is None
                    and fulfilled
                    and score_local is not None
                    and score_visit is not None
                ):
                    if score_local > score_visit:
                        ganador = "local"
                    elif score_visit > score_local:
                        ganador = "visitante"
                    else:
                        ganador = None
                    liquidar_apuesta(apuesta, apuesta.equipo_apostado == ganador)
                    liquidadas += 1
            else:
                nuevo = Partido(
                    urba_id=urba_id,
                    temporada=temporada,
                    fecha_num=fecha_num,
                    local=local_name,
                    visitante=visit_name,
                    fecha_hora=fecha_hora,
                    jugado=fulfilled,
                    score_local=score_local,
                    score_visitante=score_visit,
                )
                db.add(nuevo)
                creados += 1

    db.commit()
    return {
        "creados": creados,
        "actualizados": actualizados,
        "liquidadas": liquidadas,
        "total_rounds": len(rounds),
    }