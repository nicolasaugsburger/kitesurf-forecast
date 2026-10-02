"""Tests de `app.compass.degrees_to_compass`.

La fórmula `int((grados % 360) / 22.5 + 0.5) % 16` tiene dos trampas:

- el `% 16` final evita un IndexError a partir de 348.75°, donde `int(...)` da 16
- el `+ 0.5` redondea al punto más cercano, así que las fronteras caen en los
  múltiplos de 11.25°, no en los de 22.5°

Por eso los casos atacan fronteras y extremos, no valores cómodos del medio.
"""

import pytest

from app.compass import COMPASS_POINTS, degrees_to_compass


@pytest.mark.parametrize(
    "grados, esperado",
    [
        (0, "Norte"),
        (11.24, "Norte"),          # justo antes de la frontera
        (11.25, "Nornoreste"),     # la frontera exacta
        (11.26, "Nornoreste"),
        (45, "Noreste"),
        (180, "Sur"),
        (270, "Oeste"),
        (348.74, "Nornoroeste"),   # último valor antes del desbordamiento
        (348.75, "Norte"),         # aquí int(...) da 16: sin el % 16, IndexError
        (359.9, "Norte"),
        (360, "Norte"),            # 360 % 360 == 0
        (-1, "Norte"),             # el módulo de Python normaliza negativos
        (-90, "Oeste"),
        (720 + 45, "Noreste"),     # varias vueltas
    ],
)
def test_grados_a_punto_cardinal(grados, esperado):
    assert degrees_to_compass(grados) == esperado


def test_sin_dato_devuelve_none():
    # Open-Meteo rellena con null pasado el horizonte del modelo.
    # Antes esto reventaba con TypeError al evaluar `None % 360`.
    assert degrees_to_compass(None) is None


def test_ningun_angulo_se_sale_de_la_rosa():
    """Barrido de medio grado: ningún valor debe lanzar IndexError."""
    for medio_grado in range(0, 720 + 1):
        assert degrees_to_compass(medio_grado / 2) in COMPASS_POINTS
