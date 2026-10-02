"""Modelos SQLAlchemy.

Tres tablas, y la división entre ellas es lo que separa dos requisitos que es
fácil confundir:

- `forecast_runs` responde a "¿cuándo pedí los datos por última vez?" -> la CACHÉ
- `forecast_hours` responde a "¿cómo cambió el pronóstico de esta hora?" -> el HISTÓRICO

Se puede tener caché sin histórico; no se puede tener histórico sin obtener la
caché de regalo.
"""

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    desc,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Spot(Base):
    __tablename__ = "spots"

    id: Mapped[str] = mapped_column(Text, primary_key=True)  # 'castelldefels'
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)  # lo que pedimos
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    # Lo que AROME devuelve de verdad. A 1.3 km, la celda puede caer mar adentro
    # o tierra adentro y cambiar el viento.
    grid_latitude: Mapped[float | None] = mapped_column(Float)
    grid_longitude: Mapped[float | None] = mapped_column(Float)

    # Grados hacia los que mira la playa, para clasificar el viento como
    # offshore / side / onshore. Nullable y vacío de momento: hacen falta los
    # valores reales de las 8 playas, y inventarlos sería peor que no tenerlos.
    # La columna se crea ya porque sale gratis ahora y cuesta una migración luego.
    shore_bearing: Mapped[int | None] = mapped_column(SmallInteger)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class ForecastRun(Base):
    """Una fila por petición. Como los 8 spots van en una sola llamada HTTP,
    una pasada cubre todos: 'run' es sinónimo de 'fetch'."""

    __tablename__ = "forecast_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    model: Mapped[str] = mapped_column(Text, nullable=False)  # 'arome_france_hd'

    # De meta.json (paso 9). Nullable a propósito: los metadatos de la pasada
    # NUNCA deben ser una dependencia dura de una URL encontrada sondeando.
    model_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    model_modified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hours_ingested: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        # Descendente: la consulta caliente es "la pasada más reciente".
        Index("forecast_runs_model_fetched_idx", "model", desc("fetched_at")),
    )


class ForecastHour(Base):
    __tablename__ = "forecast_hours"

    run_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("forecast_runs.id", ondelete="CASCADE"), primary_key=True
    )
    spot_id: Mapped[str] = mapped_column(
        Text, ForeignKey("spots.id"), primary_key=True
    )
    # El instante pronosticado, siempre en UTC.
    valid_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True
    )

    wind_speed_kn: Mapped[float | None] = mapped_column(Float)
    wind_gusts_kn: Mapped[float | None] = mapped_column(Float)
    wind_direction_deg: Mapped[int | None] = mapped_column(SmallInteger)

    __table_args__ = (
        # Consulta caliente: las horas de un spot en un rango.
        Index("forecast_hours_lookup_idx", "spot_id", desc("valid_time"), desc("run_id")),
        # Vista de comparación: todos los spots a una misma hora.
        Index("forecast_hours_compare_idx", "valid_time", "spot_id"),
    )

    # OJO: aquí NO va un UNIQUE (spot_id, valid_time). Esa restricción es
    # exactamente el diseño "solo el último", e impide el histórico por
    # construcción. La unicidad vive en la clave primaria compuesta de arriba.
