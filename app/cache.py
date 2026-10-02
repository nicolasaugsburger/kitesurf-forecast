"""Caché en memoria con TTL.

La política de refresco está aislada en `should_refresh()`, que es una función
pura: no mira el reloj ni toca estado. Así se puede probar sin parchear el
tiempo ni levantar nada, que es justo lo que empuja a tenerla separada.

En la fase 2 esto se sustituye por Postgres, y `should_refresh()` sobrevive tal
cual: lo único que cambia es de dónde sale `fetched_at`.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.openmeteo import SpotForecast


def should_refresh(
    fetched_at: datetime | None,
    now: datetime,
    ttl: timedelta,
    force: bool = False,
) -> bool:
    """¿Hay que volver a pedir los datos?"""
    if force:
        return True
    if fetched_at is None:  # caché fría
        return True
    return now - fetched_at >= ttl


@dataclass(frozen=True)
class CacheEntry:
    forecasts: list[SpotForecast]
    fetched_at: datetime

    def age_seconds(self, now: datetime) -> int:
        return int((now - self.fetched_at).total_seconds())


class ForecastCache:
    """Guarda la última respuesta buena y evita refrescos simultáneos.

    El `Lock` importa aunque haya un solo usuario: con la caché fría, varias
    peticiones a la vez dispararían varias llamadas a Open-Meteo. Con el lock,
    la primera pide y las demás esperan y reutilizan su resultado.
    """

    def __init__(self) -> None:
        self._entry: CacheEntry | None = None
        self._lock = asyncio.Lock()

    @property
    def entry(self) -> CacheEntry | None:
        return self._entry

    async def get_or_refresh(self, refrescar, ttl: timedelta, force: bool = False) -> CacheEntry:
        now = datetime.now(timezone.utc)
        if not should_refresh(self._entry.fetched_at if self._entry else None, now, ttl, force):
            return self._entry  # type: ignore[return-value]

        async with self._lock:
            # Otra petición pudo refrescar mientras esperábamos el lock.
            now = datetime.now(timezone.utc)
            if not should_refresh(
                self._entry.fetched_at if self._entry else None, now, ttl, force
            ):
                return self._entry  # type: ignore[return-value]

            forecasts = await refrescar()
            self._entry = CacheEntry(forecasts=forecasts, fetched_at=datetime.now(timezone.utc))
            return self._entry
