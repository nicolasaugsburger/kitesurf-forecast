"""Configuración del proyecto.

De momento son constantes de módulo. En el paso 4, cuando entre FastAPI, esto
pasa a ser un `Settings` de pydantic-settings leído de `.env`.
"""

from zoneinfo import ZoneInfo

API_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_MODEL = "arome_france_hd"  # pydantic reserva el prefijo `model_`, de ahí el nombre
HOURLY_VARS = "wind_speed_10m,wind_gusts_10m,wind_direction_10m"

# AROME HD da ~67-69 h. Pedir de más es gratis porque recortamos las horas
# nulas, y así no truncamos si algún día el modelo alarga su horizonte.
FORECAST_DAYS = 4
WIND_SPEED_UNIT = "kn"  # nudos, para comparar directo contra Windguru

# Solo para renderizar: los instantes se piden y se guardan siempre en UTC.
DISPLAY_TIMEZONE = ZoneInfo("Europe/Madrid")  # requiere el paquete `tzdata` en Windows

USER_AGENT = "kitesurf-forecast/0.1 (proyecto personal)"
HTTP_TIMEOUT = (5, 15)  # (conexión, lectura) en segundos
