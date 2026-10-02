"""Cliente de Open-Meteo: pide el pronóstico y lo normaliza.

Dos responsabilidades deliberadamente separadas:

- `fetch_raw()` habla por HTTP (impuro, necesita red, async).
- `normalize()` transforma la respuesta en dataclasses (puro, testeable con un
  fixture y sin red). Ahí es donde viven los errores de verdad.

Lo que sale de aquí no tiene presentación: los instantes son `datetime` en UTC y
la dirección son grados. La hora local y la rosa de los vientos se renderizan en
el borde (el script o, más adelante, la API).
"""

from dataclasses import dataclass
from datetime import datetime, timezone

import asyncio

import httpx

from app.config import (
    API_URL,
    FORECAST_DAYS,
    HOURLY_VARS,
    HTTP_TIMEOUT,
    USER_AGENT,
    WEATHER_MODEL,
    WIND_SPEED_UNIT,
)
from app.spots import Spot


@dataclass(frozen=True)
class ForecastHour:
    valid_time: datetime  # siempre UTC
    wind_speed_kn: float | None
    wind_gusts_kn: float | None
    wind_direction_deg: float | None


@dataclass(frozen=True)
class SpotForecast:
    spot: Spot
    # Celda real del modelo. A 1.3 km de resolución, la celda elegida puede caer
    # mar adentro o tierra adentro y cambiar el viento.
    grid_lat: float
    grid_lon: float
    hours: list[ForecastHour]


# Reintentos solo donde tiene sentido: fallos de conexión, 5xx y 429. Un 4xx
# significa que la petición está mal construida y reintentarla no la arregla.
REINTENTOS = 3
ESPERAS = [1.0, 2.0, 4.0]


async def fetch_raw(client: httpx.AsyncClient, spots: list[Spot]) -> list[dict]:
    """Pide TODOS los spots en una sola petición (coordenadas separadas por comas).

    Open-Meteo devuelve un array en el mismo orden de entrada. Ojo: el elemento 0
    no trae la clave `location_id`, así que emparejamos por posición, nunca por id.
    """
    params = {
        "latitude": ",".join(str(spot.lat) for spot in spots),
        "longitude": ",".join(str(spot.lon) for spot in spots),
        "hourly": HOURLY_VARS,
        "models": WEATHER_MODEL,
        "forecast_days": FORECAST_DAYS,
        "timezone": "UTC",
        "timeformat": "unixtime",
        "wind_speed_unit": WIND_SPEED_UNIT,
    }
    data = await _get_con_reintentos(client, params)

    # Con una sola coordenada la API devuelve un objeto; con varias, una lista.
    return data if isinstance(data, list) else [data]


def normalize(spots: list[Spot], results: list[dict]) -> list[SpotForecast]:
    """Empareja spots con resultados (por posición) y descarta las horas sin dato."""
    if len(results) != len(spots):
        raise ValueError(
            f"Open-Meteo devolvió {len(results)} resultados para {len(spots)} spots"
        )
    return [normalize_spot(spot, result) for spot, result in zip(spots, results)]


def normalize_spot(spot: Spot, result: dict) -> SpotForecast:
    hourly = result["hourly"]
    hours = []
    for ts, speed, gusts, direction in zip(
        hourly["time"],
        hourly["wind_speed_10m"],
        hourly["wind_gusts_10m"],
        hourly["wind_direction_10m"],
    ):
        # Relleno de Open-Meteo pasado el horizonte del modelo: no lo guardamos.
        if speed is None and gusts is None and direction is None:
            continue
        hours.append(
            ForecastHour(
                valid_time=datetime.fromtimestamp(ts, timezone.utc),
                wind_speed_kn=speed,
                wind_gusts_kn=gusts,
                wind_direction_deg=direction,
            )
        )

    return SpotForecast(
        spot=spot,
        grid_lat=result["latitude"],
        grid_lon=result["longitude"],
        hours=hours,
    )


async def _get_con_reintentos(client: httpx.AsyncClient, params: dict) -> object:
    ultimo: Exception | None = None
    for intento in range(REINTENTOS):
        try:
            response = await client.get(API_URL, params=params)
            if response.status_code == 429 or response.status_code >= 500:
                response.raise_for_status()
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as exc:
            # Un 4xx (salvo 429) no se arregla reintentando: aborta ya.
            if exc.response.status_code < 500 and exc.response.status_code != 429:
                raise
            ultimo = exc
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            ultimo = exc

        if intento < REINTENTOS - 1:
            await asyncio.sleep(ESPERAS[intento])

    raise ultimo  # type: ignore[misc]


async def fetch_forecast(
    client: httpx.AsyncClient, spots: list[Spot]
) -> list[SpotForecast]:
    """Atajo: pide y normaliza."""
    return normalize(spots, await fetch_raw(client, spots))
