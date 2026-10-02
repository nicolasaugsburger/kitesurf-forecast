"""Fixtures compartidos.

Dos fuentes de datos, a propósito:

- `respuesta_real`: una respuesta de verdad de Open-Meteo. Cubre la forma del
  JSON, el relleno nulo y los instantes, y es lo único que delataría un cambio
  de formato aguas arriba.
- `respuesta_sintetica`: valores inventados y distintos por spot. Sirve para
  afirmar el emparejamiento por posición: si se desplaza, el fallo es obvio.
"""

import json
from pathlib import Path

import pytest

from app.spots import Spot

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def respuesta_real() -> list[dict]:
    with open(FIXTURES / "openmeteo_arome.json", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def spots_sinteticos() -> list[Spot]:
    return [
        Spot("spot_a", "Spot A", 1.0, 1.0, "ES"),
        Spot("spot_b", "Spot B", 2.0, 2.0, "ES"),
        Spot("spot_c", "Spot C", 3.0, 3.0, "FR"),
    ]


@pytest.fixture
def respuesta_sintetica() -> list[dict]:
    """Tres spots con valores deliberadamente distintos: A=10, B=20, C=30 nudos.

    Un desplazamiento de una posición convierte 10.0 en 20.0, que se lee solo.
    """
    def resultado(indice: int) -> dict:
        valor = (indice + 1) * 10.0
        return {
            "latitude": float(indice + 1),
            "longitude": float(indice + 1),
            "hourly": {
                "time": [1789423200, 1789426800],  # dos horas consecutivas
                "wind_speed_10m": [valor, valor],
                "wind_gusts_10m": [valor + 5, valor + 5],
                "wind_direction_10m": [float(indice + 1), float(indice + 1)],
            },
        }

    return [resultado(i) for i in range(3)]


@pytest.fixture
def api(respuesta_real, monkeypatch):
    """Cliente de prueba con Open-Meteo falseado por debajo del cliente httpx.

    Se sustituye el transporte, no la función: el código recorre su camino real
    (reintentos, parseo, emparejamiento por posición) y solo cambia el cable.

    Devuelve (cliente, estado) donde `estado` lleva la cuenta de llamadas y
    permite programar fallos desde el test.
    """
    import httpx
    from fastapi.testclient import TestClient

    from app.cache import ForecastCache
    from app.main import app

    monkeypatch.setattr("app.openmeteo.ESPERAS", [0.0, 0.0, 0.0])  # sin esperas reales

    estado = {"llamadas": 0, "respuestas": []}  # respuestas: lista de códigos a devolver

    def handler(request: httpx.Request) -> httpx.Response:
        estado["llamadas"] += 1
        codigo = estado["respuestas"].pop(0) if estado["respuestas"] else 200
        if codigo == 200:
            return httpx.Response(200, json=respuesta_real)
        return httpx.Response(codigo, json={"error": True})

    with TestClient(app) as client:
        # `app` es un objeto de módulo: sin esto, la caché de un test se filtra
        # al siguiente y lo hace pasar por el motivo equivocado.
        app.state.cache = ForecastCache()
        anterior = app.state.http
        app.state.http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            yield client, estado
        finally:
            app.state.http = anterior
