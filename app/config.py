"""Configuración del proyecto, leída del entorno o de un `.env`.

pydantic-settings valida los tipos al arrancar: si `CACHE_TTL_MINUTES` no es un
número, la app no levanta en vez de fallar raro a la primera petición.
"""

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_url: str = "https://api.open-meteo.com/v1/forecast"
    # pydantic reserva el prefijo `model_`: un campo `model` chocaría con
    # `model_config`. De ahí el nombre.
    weather_model: str = "arome_france_hd"
    hourly_vars: str = "wind_speed_10m,wind_gusts_10m,wind_direction_10m"

    # AROME HD da ~67-69 h. Pedir de más es gratis porque recortamos las horas
    # nulas, y así no truncamos si algún día el modelo alarga su horizonte.
    forecast_days: int = 4
    wind_speed_unit: str = "kn"  # nudos, para comparar directo contra Windguru

    # AROME corre cada 3 h, pero Open-Meteo publica con retraso y no expone
    # cabeceras de caché. Un TTL fijo de 30 min acota lo viejo que puede estar
    # el dato sin depender de adivinar cuándo aterriza cada pasada.
    cache_ttl_minutes: int = 30

    # El puerto 5433 en el host evita chocar con un Postgres local.
    database_url: str = "postgresql+asyncpg://kite:kite@localhost:5433/kitesurf"

    display_timezone: str = "Europe/Madrid"
    user_agent: str = "kitesurf-forecast/0.1 (proyecto personal)"
    http_connect_timeout: float = 5.0
    http_read_timeout: float = 15.0

    @property
    def tz(self) -> ZoneInfo:
        """Solo para renderizar: los instantes se guardan siempre en UTC."""
        return ZoneInfo(self.display_timezone)  # requiere `tzdata` en Windows


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

# Alias para no romper lo que ya importaba constantes de este módulo.
API_URL = settings.api_url
WEATHER_MODEL = settings.weather_model
HOURLY_VARS = settings.hourly_vars
FORECAST_DAYS = settings.forecast_days
WIND_SPEED_UNIT = settings.wind_speed_unit
DISPLAY_TIMEZONE = settings.tz
USER_AGENT = settings.user_agent
HTTP_TIMEOUT = (settings.http_connect_timeout, settings.http_read_timeout)
