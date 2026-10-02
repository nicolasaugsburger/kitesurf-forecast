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
