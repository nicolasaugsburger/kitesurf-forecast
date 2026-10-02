"""Tests de `app.openmeteo.normalize`.

Es la función donde viven los bugs de verdad de este proyecto: emparejar spots
con resultados, descartar el relleno nulo y leer los instantes. Todo puro: sin
red y sin base de datos.
"""

from datetime import datetime, timezone

import pytest

from app.openmeteo import normalize
from app.spots import SPOTS


# --- Emparejamiento por posición ---------------------------------------
# Open-Meteo devuelve un array en el orden de entrada, pero el elemento 0 NO
# trae la clave `location_id` (los demás sí). Emparejar por `location_id`
# desplazaría todos los spots en uno, sin lanzar ningún error.

def test_empareja_por_posicion(spots_sinteticos, respuesta_sintetica):
    resultado = normalize(spots_sinteticos, respuesta_sintetica)

    assert [f.spot.id for f in resultado] == ["spot_a", "spot_b", "spot_c"]
    # A=10, B=20, C=30: un desplazamiento de una posición rompe esto a la cara.
    assert [f.hours[0].wind_speed_kn for f in resultado] == [10.0, 20.0, 30.0]


def test_empareja_por_posicion_con_datos_reales(respuesta_real):
    resultado = normalize(SPOTS, respuesta_real)

    # La celda que devuelve AROME cae siempre a menos de ~0.05 grados del punto
    # pedido. Si el emparejamiento se desplazara, a Castelldefels (41.27) le
    # tocaría la celda de otro spot y esto reventaría.
    for forecast in resultado:
        assert forecast.grid_lat == pytest.approx(forecast.spot.lat, abs=0.05)
        assert forecast.grid_lon == pytest.approx(forecast.spot.lon, abs=0.05)


def test_longitudes_distintas_lanza_error(respuesta_real):
    with pytest.raises(ValueError, match="resultados"):
        normalize(SPOTS[:3], respuesta_real)  # 3 spots contra 8 resultados


# --- Relleno nulo ------------------------------------------------------
# Pedimos forecast_days=4 a sabiendas de que AROME sólo llega a ~67 h: pedir de
# más es gratis porque recortamos aquí, y así no truncamos si alarga su horizonte.

def test_descarta_las_horas_de_relleno(respuesta_real):
    crudas = len(respuesta_real[0]["hourly"]["time"])
    nulas = sum(1 for v in respuesta_real[0]["hourly"]["wind_speed_10m"] if v is None)

    resultado = normalize(SPOTS, respuesta_real)

    assert crudas == 96 and nulas == 29  # el fixture es fijo
    assert len(resultado[0].hours) == crudas - nulas == 67


def test_no_queda_ninguna_hora_sin_datos(respuesta_real):
    resultado = normalize(SPOTS, respuesta_real)

    for forecast in resultado:
        for hour in forecast.hours:
            assert not (
                hour.wind_speed_kn is None
                and hour.wind_gusts_kn is None
                and hour.wind_direction_deg is None
            )


# --- Instantes ---------------------------------------------------------
# `timeformat=unixtime` da enteros epoch. Hay que leerlos como UTC explícito:
# `datetime.fromtimestamp(ts)` sin tz usaría la hora local de la máquina, que en
# Windows no es la del servidor ni la del usuario necesariamente.

def test_los_instantes_son_utc(respuesta_real):
    resultado = normalize(SPOTS, respuesta_real)
    primera = resultado[0].hours[0]

    assert primera.valid_time.tzinfo is timezone.utc
    assert primera.valid_time == datetime.fromtimestamp(
        respuesta_real[0]["hourly"]["time"][0], timezone.utc
    )


def test_las_horas_son_consecutivas(respuesta_real):
    horas = normalize(SPOTS, respuesta_real)[0].hours

    diffs = {
        (b.valid_time - a.valid_time).total_seconds()
        for a, b in zip(horas, horas[1:])
    }
    assert diffs == {3600.0}
