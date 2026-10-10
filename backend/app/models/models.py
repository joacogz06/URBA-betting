from datetime import datetime
from sqlalchemy import (
    Integer, String, Float, Boolean,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Factor(Base):
    __tablename__ = "factores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    peso: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    orden: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Partido(Base):
    __tablename__ = "partidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    urba_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    temporada: Mapped[str] = mapped_column(String(10), nullable=False)  # "2026"
    fecha_num: Mapped[int] = mapped_column(Integer, nullable=False)     # 14

    local: Mapped[str] = mapped_column(String(100), nullable=False)
    visitante: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Resultado final (lo carga URBA cuando el partido termina)
    jugado: Mapped[bool] = mapped_column(Boolean, default=False)
    score_local: Mapped[int] = mapped_column(Integer, nullable=True)
    score_visitante: Mapped[int] = mapped_column(Integer, nullable=True)

    # Cuotas manuales
    cuota_local_betsson: Mapped[float] = mapped_column(Float, nullable=True)
    cuota_local_codere: Mapped[float] = mapped_column(Float, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calculos: Mapped[list["Calculo"]] = relationship(back_populates="partido")
    apuesta: Mapped["Apuesta"] = relationship(back_populates="partido", uselist=False)


class Calculo(Base):
    __tablename__ = "calculos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False)

    probabilidad_local: Mapped[float] = mapped_column(Float, nullable=False)
    probabilidad_visitante: Mapped[float] = mapped_column(Float, nullable=False)

    # Snapshot: {"Localía": 2, "Historial": -1, ...}
    valores_factores: Mapped[dict] = mapped_column(JSON, nullable=False)
    # Snapshot: {"Localía": 2.0, "Historial": 1.0, ...}
    pesos_factores: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    partido: Mapped["Partido"] = relationship(back_populates="calculos")


class Apuesta(Base):
    __tablename__ = "apuestas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    partido_id: Mapped[int] = mapped_column(ForeignKey("partidos.id"), nullable=False, unique=True)

    equipo_apostado: Mapped[str] = mapped_column(String(100), nullable=False)  # "local" | "visitante"
    stake: Mapped[float] = mapped_column(Float, nullable=False)
    cuota: Mapped[float] = mapped_column(Float, nullable=False)

    # null = pendiente, True = ganada, False = perdida
    resultado: Mapped[bool] = mapped_column(Boolean, nullable=True)
    ganancia_neta: Mapped[float] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    partido: Mapped["Partido"] = relationship(back_populates="apuesta")


class FechaFactores(Base):
    __tablename__ = "fecha_factores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    temporada: Mapped[str] = mapped_column(String(10), nullable=False)
    fecha_num: Mapped[int] = mapped_column(Integer, nullable=False)

    # Snapshot completo: [{"nombre": "Localía", "peso": 2.0}, ...]
    factores: Mapped[list] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)