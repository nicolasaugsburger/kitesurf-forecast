"""Endpoints HTTP.

Las rutas solo orquestan: validan parámetros, piden a la caché y renderizan.
Nada de lógica de dominio aquí.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query, Request

from app.config import settings
from app.openmeteo import fetch_forecast
from app.render import render_forecast, to_timestamp_iso
from app.schemas import ForecastResponse, HealthResponse, RefreshResponse, SpotOut
from app.spots import SPOTS

router = APIRouter()

TTL = timedelta(minutes=settings.cache_ttl_minutes)
# Suelo para el refresco forzado: sin autenticación, esto es lo único que impide
# que un F5 repetido martillee Open-Meteo.
REFRESH_FLOOR = timedelta(seconds=60)


async def _entrada(request: Request, force: bool = False):
    cache = request.app.state.cache
    client = request.app.state.http

    async def refrescar():
        return await fetch_forecast(client, SPOTS)

    try:
        return await cache.get_or_refresh(refrescar, TTL, force=force)
    except Exception as exc:
        # Si hay una copia buena previa, servirla vale más que un 503: el dato
        # viejo sigue siendo útil, y `stale` avisa de que lo es.
        if cache.entry is not None:
            return cache.entry
        raise HTTPException(
            status_code=503, detail=f"no hay datos de pronóstico disponibles: {exc}"
        ) from exc


def _respuesta(entry, warnings: list[str] | None = None) -> dict:
    return render_forecast(
        entry,
        source="open-meteo",
        model=settings.weather_model,
        timezone_name=settings.display_timezone,
        ttl_seconds=int(TTL.total_seconds()),
        warnings=warnings,
    )


@router.get("/health", response_model=HealthResponse, tags=["meta"])
async def health(request: Request) -> dict:
    """Barato a propósito: no llama a Open-Meteo.

    Si dependiera de un tercero, la salud se pondría en rojo justo cuando el
    diseño de servir-datos-viejos está haciendo su trabajo.
    """
    entry = request.app.state.cache.entry
    now = datetime.now(timezone.utc)
    age = entry.age_seconds(now) if entry else None
    return {
        "status": "ok",
        "cache": "warm" if entry else "cold",
        "fetched_at": to_timestamp_iso(entry.fetched_at) if entry else None,
        "age_seconds": age,
        "stale": age is not None and age >= TTL.total_seconds(),
    }


@router.get("/api/spots", response_model=list[SpotOut], tags=["spots"])
async def listar_spots() -> list[dict]:
    return [
        {"id": s.id, "name": s.name, "country": s.country, "lat": s.lat, "lon": s.lon}
        for s in SPOTS
    ]


@router.get("/api/forecast", response_model=ForecastResponse, tags=["forecast"])
async def forecast(
    request: Request,
    spots: str | None = Query(None, description="ids separados por comas"),
    hours: int | None = Query(None, ge=1, le=96, description="horas desde ahora"),
) -> dict:
    """Todos los spots de una vez: es la vista de comparación, no un atajo."""
    payload = _respuesta(await _entrada(request))

    if spots:
        pedidos = [s.strip() for s in spots.split(",") if s.strip()]
        conocidos = {s.id for s in SPOTS}
        if desconocidos := [s for s in pedidos if s not in conocidos]:
            raise HTTPException(404, f"spots desconocidos: {', '.join(desconocidos)}")
        payload["spots"] = [s for s in payload["spots"] if s["id"] in pedidos]

    if hours:
        payload["spots"] = [_recortar(s, hours) for s in payload["spots"]]

    return payload


@router.get("/api/forecast/{spot_id}", response_model=ForecastResponse, tags=["forecast"])
async def forecast_spot(
    request: Request,
    spot_id: str,
    hours: int | None = Query(None, ge=1, le=96),
) -> dict:
    if spot_id not in {s.id for s in SPOTS}:
        raise HTTPException(404, f"spot desconocido: {spot_id}")

    payload = _respuesta(await _entrada(request))
    payload["spots"] = [s for s in payload["spots"] if s["id"] == spot_id]
    if hours:
        payload["spots"] = [_recortar(s, hours) for s in payload["spots"]]
    return payload


@router.post("/api/refresh", response_model=RefreshResponse, tags=["meta"])
async def refresh(request: Request, force: bool = Query(False)) -> dict:
    """POST, no `?force=true` en el GET: la lectura debe seguir siendo segura.

    Un flag de refresco en un GET invita a que un F5 del navegador machaque la
    API de terceros.
    """
    cache = request.app.state.cache
    now = datetime.now(timezone.utc)

    if force and cache.entry and now - cache.entry.fetched_at < REFRESH_FLOOR:
        entry = cache.entry
        return {
            "refreshed": False,
            "fetched_at": to_timestamp_iso(entry.fetched_at),
            "age_seconds": entry.age_seconds(now),
            "spots": len(entry.forecasts),
            "hours": len(entry.forecasts[0].hours) if entry.forecasts else 0,
            "skipped_reason": "too_soon",
        }

    previo = cache.entry.fetched_at if cache.entry else None
    entry = await _entrada(request, force=force)
    now = datetime.now(timezone.utc)
    refrescado = entry.fetched_at != previo
    return {
        "refreshed": refrescado,
        "fetched_at": to_timestamp_iso(entry.fetched_at),
        "age_seconds": entry.age_seconds(now),
        "spots": len(entry.forecasts),
        "hours": len(entry.forecasts[0].hours) if entry.forecasts else 0,
        # Sin esto, un `refreshed: false` no dice si fue por caché fresca o por
        # un fallo arriba, que son situaciones muy distintas.
        "skipped_reason": None if refrescado else "cache_fresh",
    }


def _recortar(spot: dict, hours: int) -> dict:
    """Deja las `hours` primeras horas que aún no han pasado."""
    ahora = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    futuras = [h for h in spot["hours"] if h["valid_time_utc"] >= ahora]
    return {**spot, "hours": futuras[:hours]}
