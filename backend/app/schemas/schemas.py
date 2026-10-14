from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Factores ──────────────────────────────────────────────
class FactorBase(BaseModel):
    nombre: str
    peso: float = 1.0
    orden: int = 0

class FactorCreate(FactorBase):
    pass

class FactorUpdate(BaseModel):
    nombre: Optional[str] = None
    peso: Optional[float] = None
    activo: Optional[bool] = None
    orden: Optional[int] = None

class FactorOut(FactorBase):
    id: int
    activo: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Partidos ──────────────────────────────────────────────
class PartidoBase(BaseModel):
    urba_id: str
    temporada: str
    fecha_num: int
    local: str
    visitante: str
    fecha_hora: Optional[datetime] = None

class PartidoCreate(PartidoBase):
    pass

class PartidoCuotasUpdate(BaseModel):
    cuota_local_betsson: Optional[float] = None
    cuota_local_codere: Optional[float] = None
    cuota_visitante_betsson: Optional[float] = None
    cuota_visitante_codere: Optional[float] = None

class PartidoOut(PartidoBase):
    id: int
    jugado: bool
    score_local: Optional[int] = None
    score_visitante: Optional[int] = None
    cuota_local_betsson: Optional[float] = None
    cuota_local_codere: Optional[float] = None
    cuota_visitante_betsson: Optional[float] = None
    cuota_visitante_codere: Optional[float] = None
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Calculos ──────────────────────────────────────────────
class CalculoCreate(BaseModel):
    partido_id: int
    valores_factores: dict  # {nombre_factor: valor (-2 a 2)}

class CalculoOut(BaseModel):
    id: int
    partido_id: int
    probabilidad_local: float
    probabilidad_visitante: float
    valores_factores: dict
    pesos_factores: dict
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Apuestas ──────────────────────────────────────────────
class ApuestaCreate(BaseModel):
    partido_id: int
    equipo_apostado: str  # "local" | "visitante"
    stake: float
    cuota: float

class ApuestaResultado(BaseModel):
    resultado: bool
    ganancia_neta: float

class ApuestaOut(ApuestaCreate):
    id: int
    resultado: Optional[bool] = None
    ganancia_neta: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── FechaFactores ─────────────────────────────────────────
class FechaFactoresCreate(BaseModel):
    temporada: str
    fecha_num: int
    factores: list

class FechaFactoresOut(FechaFactoresCreate):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}