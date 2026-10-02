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
        "spot": spot.id,
        "name": spot.name,
        "country": spot.country,
        "lat": spot.lat,
        "lon": spot.lon,
        "grid_lat": forecast.grid_lat,
        "grid_lon": forecast.grid_lon,
        "hours": [render_hour(hour) for hour in forecast.hours],
    }
