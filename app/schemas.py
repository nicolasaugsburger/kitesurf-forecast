"""Modelos de respuesta de la API.

Deliberadamente distintos de los del dominio (`app.openmeteo`): aquí los
instantes ya son cadenas renderizadas y aparece la rosa de los vientos, que no
se almacena. Separar ambas capas es lo que permite cambiar el almacenamiento sin
tocar el contrato HTTP, y al revés.
"""

from pydantic import BaseModel


class HourOut(BaseModel):
    valid_time_utc: str
    valid_time_local: str  # siempre con offset explícito
    wind_speed_kn: float | None
    wind_gusts_kn: float | None
    wind_direction_deg: float | None
    wind_direction_compass: str | None


class SpotOut(BaseModel):
    id: str
    name: str
    country: str
    lat: float
    lon: float


class SpotForecastOut(SpotOut):
    # Celda real del modelo, que no coincide con el punto pedido.
    grid_lat: float
    grid_lon: float
    hours: list[HourOut]


class ForecastResponse(BaseModel):
    """Los metadatos van arriba, no por spot: una pasada cubre los 8 a la vez."""

    generated_at: str
    source: str
    model: str
    timezone: str
    fetched_at: str
    age_seconds: int
    stale: bool
    warnings: list[str]
    spots: list[SpotForecastOut]


class HealthResponse(BaseModel):
    status: str
    cache: str
    fetched_at: str | None
    age_seconds: int | None
    stale: bool


class RefreshResponse(BaseModel):
    refreshed: bool
    fetched_at: str
    age_seconds: int
    spots: int
    hours: int
    skipped_reason: str | None = None
