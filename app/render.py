"""Renderizado: del dominio (instantes UTC, grados) a la presentación.

Esta es la frontera del proyecto. Todo lo que hay detrás —`openmeteo.py`, y más
adelante la base de datos— trabaja con instantes en UTC y grados. El reloj de
pared y la rosa de los vientos en español se calculan aquí y solo aquí.

La regla: un instante es un número, un reloj de pared es un renderizado.
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from app.compass import degrees_to_compass
from app.config import DISPLAY_TIMEZONE
from app.openmeteo import ForecastHour, SpotForecast


def to_utc_iso(moment: datetime) -> str:
    """ISO 8601 en UTC, con sufijo Z."""
    return moment.isoformat().replace("+00:00", "Z")


def to_timestamp_iso(moment: datetime) -> str:
    """Instante para los metadatos de la API, al segundo.

    Centralizado a propósito: cuando cada endpoint lo formateaba por su cuenta,
    el mismo `fetched_at` salía con microsegundos en unos y sin ellos en otros.
    """
    return to_utc_iso(moment.replace(microsecond=0))


def to_local_iso(moment: datetime, tz: ZoneInfo = DISPLAY_TIMEZONE) -> str:
    """ISO 8601 en hora local, SIEMPRE con offset explícito.

    Nunca devolvemos cadenas ingenuas: el cliente puede quitar un offset, pero
    no puede inventárselo. En el cambio de horario de octubre hay dos instantes
    distintos que caen en el mismo reloj de pared, y el offset es lo único que
    los distingue.
    """
    return moment.astimezone(tz).isoformat()


def render_hour(hour: ForecastHour) -> dict:
    return {
        "valid_time_utc": to_utc_iso(hour.valid_time),
        "valid_time_local": to_local_iso(hour.valid_time),
        "wind_speed_kn": hour.wind_speed_kn,
        "wind_gusts_kn": hour.wind_gusts_kn,
        "wind_direction_deg": hour.wind_direction_deg,
        "wind_direction_compass": degrees_to_compass(hour.wind_direction_deg),
    }


def render_spot(forecast: SpotForecast) -> dict:
    spot = forecast.spot
    return {
        "id": spot.id,
        "name": spot.name,
        "country": spot.country,
        "lat": spot.lat,
        "lon": spot.lon,
        "grid_lat": forecast.grid_lat,
        "grid_lon": forecast.grid_lon,
        "hours": [render_hour(hour) for hour in forecast.hours],
    }


def render_forecast(
    entry,
    *,
    source: str,
    model: str,
    timezone_name: str,
    ttl_seconds: int,
    warnings: list[str] | None = None,
) -> dict:
    """Envuelve una entrada de caché en la respuesta completa de la API."""
    from datetime import datetime, timezone as _tz

    now = datetime.now(_tz.utc)
    age = entry.age_seconds(now)
    return {
        "generated_at": to_timestamp_iso(now),
        "source": source,
        "model": model,
        "timezone": timezone_name,
        "fetched_at": to_timestamp_iso(entry.fetched_at),
        "age_seconds": age,
        # `stale` dice que servimos datos más viejos que el TTL porque el
        # refresco falló: el cliente puede atenuarlos en vez de creérselos.
        "stale": age >= ttl_seconds,
        "warnings": warnings or [],
        "spots": [render_spot(f) for f in entry.forecasts],
    }
