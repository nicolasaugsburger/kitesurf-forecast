"""
Consulta el pronóstico de viento (Open-Meteo / AROME France HD) para una lista
de spots de kitesurf y devuelve un JSON normalizado, listo para comparar
todos los spots en una misma pantalla.
"""

import json
from datetime import datetime, timezone

import requests

# --- Configuración -----------------------------------------------------

SPOTS = [
    {"id": "castelldefels", "name": "Castelldefels", "lat": 41.2652, "lon": 1.9523, "country": "ES"},
    {"id": "barcelona", "name": "Barcelona", "lat": 41.38, "lon": 2.19, "country": "ES"},
    {"id": "vilanova", "name": "Vilanova", "lat": 41.21, "lon": 1.72, "country": "ES"},
    {"id": "trabucador", "name": "Playa del Trabucador", "lat": 40.62, "lon": 0.68, "country": "ES"},
    {"id": "riumar", "name": "Riumar", "lat": 40.73, "lon": 0.84, "country": "ES"},
    {"id": "sant_pere_pescador", "name": "Sant Pere Pescador", "lat": 42.2, "lon": 3.11, "country": "ES"},
    {"id": "leucate", "name": "Leucate", "lat": 42.84, "lon": 3.02, "country": "FR"},
    {"id": "saint_cyprien", "name": "Saint-Cyprien", "lat": 42.64, "lon": 3.03, "country": "FR"},
]

API_URL = "https://api.open-meteo.com/v1/forecast"
MODEL = "arome_france_hd"
HOURLY_VARS = "wind_speed_10m,wind_gusts_10m,wind_direction_10m"
FORECAST_DAYS = 2
TIMEZONE = "Europe/Madrid"  # Barcelona usa la misma zona horaria que Madrid (CET/CEST)
WIND_SPEED_UNIT = "kn"  # nudos, para comparar directo contra Windguru

# Rosa de los vientos de 16 puntos, en español
COMPASS_POINTS = [
    "Norte", "Nornoreste", "Noreste", "Estenoreste",
    "Este", "Estesureste", "Sureste", "Sursureste",
    "Sur", "Sursuroeste", "Suroeste", "Oestesuroeste",
    "Oeste", "Oestenoroeste", "Noroeste", "Nornoroeste",
]


def degrees_to_compass(degrees: float) -> str:
    """Convierte grados (0-360) al punto cardinal más cercano (rosa de 16 puntos)."""
    index = int((degrees % 360) / 22.5 + 0.5) % 16
    return COMPASS_POINTS[index]


def fetch_spot_forecast(spot: dict) -> dict:
    """Pide el pronóstico a Open-Meteo para un spot y lo normaliza."""
    params = {
        "latitude": spot["lat"],
        "longitude": spot["lon"],
        "hourly": HOURLY_VARS,
        "models": MODEL,
        "forecast_days": FORECAST_DAYS,
        "timezone": TIMEZONE,
        "wind_speed_unit": WIND_SPEED_UNIT,
    }
    response = requests.get(API_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    hourly = data["hourly"]
    forecast = []
    for i, time in enumerate(hourly["time"]):
        direction_deg = hourly["wind_direction_10m"][i]
        forecast.append({
            "time": time,
            "wind_speed_kn": hourly["wind_speed_10m"][i],
            "wind_gusts_kn": hourly["wind_gusts_10m"][i],
            "wind_direction_deg": direction_deg,
            "wind_direction_compass": degrees_to_compass(direction_deg),
        })

    return {
        "spot": spot["id"],
        "name": spot["name"],
        "country": spot["country"],
        "lat": spot["lat"],
        "lon": spot["lon"],
        "source": "open-meteo",
        "model": MODEL,
        "forecast": forecast,
    }


def main():
    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "spots": [fetch_spot_forecast(spot) for spot in SPOTS],
    }

    with open("forecast.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Listo. {len(results['spots'])} spots guardados en forecast.json")


if __name__ == "__main__":
    main()
