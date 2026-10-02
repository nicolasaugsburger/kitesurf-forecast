"""
Vuelca a forecast.json el pronóstico de viento de todos los spots.

Script fino: la lógica vive en el paquete `app`. Aquí solo queda la
orquestación; el renderizado está en `app/render.py`.
"""

import asyncio
import json
from datetime import datetime, timezone

import httpx

from app.config import DISPLAY_TIMEZONE, WEATHER_MODEL, settings
from app.openmeteo import fetch_forecast
from app.render import render_spot
from app.spots import SPOTS


async def main():
    async with httpx.AsyncClient(
        headers={"User-Agent": settings.user_agent},
        timeout=httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0),
    ) as client:
        forecasts = await fetch_forecast(client, SPOTS)

    payload = {
        "generated_at": datetime.now(timezone.utc)
            .isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "open-meteo",
        "model": WEATHER_MODEL,
        "timezone": str(DISPLAY_TIMEZONE),
        "spots": [render_spot(forecast) for forecast in forecasts],
    }

    with open("forecast.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    hours = len(payload["spots"][0]["hours"])
    print(f"Listo. {len(payload['spots'])} spots x {hours} h guardados en forecast.json")


if __name__ == "__main__":
    asyncio.run(main())
