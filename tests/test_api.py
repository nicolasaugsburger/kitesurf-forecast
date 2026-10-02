"""Tests del contrato HTTP.

Open-Meteo se falsea con `httpx.MockTransport`, por debajo del cliente: así el
código recorre su camino real (reintentos incluidos) y el falso transporte puede
contar peticiones, que es como se demuestra que la caché funciona.
"""

ENVOLTORIO = {
    "generated_at", "source", "model", "timezone",
    "fetched_at", "age_seconds", "stale", "warnings", "spots",
}


def test_forecast_devuelve_el_envoltorio_completo(api):
    client, _ = api
    r = client.get("/api/forecast")

    assert r.status_code == 200
    cuerpo = r.json()
    assert set(cuerpo) == ENVOLTORIO
    assert cuerpo["model"] == "arome_france_hd"
    assert len(cuerpo["spots"]) == 8
    assert cuerpo["stale"] is False


def test_la_cache_evita_la_segunda_peticion(api):
    """La prueba de que hay caché es el contador, no que la respuesta sea rápida."""
    client, estado = api

    primera = client.get("/api/forecast").json()
    segunda = client.get("/api/forecast").json()

    assert estado["llamadas"] == 1
    assert primera["fetched_at"] == segunda["fetched_at"]


def test_las_horas_locales_llevan_offset(api):
    client, _ = api
    horas = client.get("/api/forecast").json()["spots"][0]["hours"]

    assert all(h["valid_time_local"][-6] in "+-" for h in horas)
    assert all(h["valid_time_utc"].endswith("Z") for h in horas)


def test_filtrar_por_spots(api):
    client, _ = api
    cuerpo = client.get("/api/forecast?spots=leucate,riumar").json()

    assert {s["id"] for s in cuerpo["spots"]} == {"leucate", "riumar"}


def test_spot_desconocido_da_404(api):
    client, _ = api
    assert client.get("/api/forecast?spots=nope").status_code == 404
    assert client.get("/api/forecast/nope").status_code == 404


def test_sin_datos_y_con_fallo_arriba_da_503(api):
    """Caché fría + Open-Meteo caído: no hay nada que servir."""
    client, estado = api
    estado["respuestas"] = [500, 500, 500]

    assert client.get("/api/forecast").status_code == 503


def test_con_fallo_arriba_pero_con_copia_previa_sirve_la_copia(api):
    """Un fallo de refresco NUNCA debe tumbar una lectura."""
    client, estado = api

    buena = client.get("/api/forecast").json()

    # Fuerza el refresco y haz que Open-Meteo falle los 3 intentos.
    estado["respuestas"] = [500, 500, 500]
    r = client.post("/api/refresh?force=1")

    assert r.status_code == 200
    assert r.json()["fetched_at"] == buena["fetched_at"]  # sigue siendo la copia buena


def test_reintenta_los_5xx_y_acaba_sirviendo(api):
    """Dos 500 y luego un 200: debe salir adelante, no rendirse al primero."""
    client, estado = api
    estado["respuestas"] = [500, 500, 200]

    r = client.get("/api/forecast")

    assert r.status_code == 200
    assert estado["llamadas"] == 3


def test_no_reintenta_los_4xx(api):
    """Un 400 no se arregla reintentando: debe abortar al primer intento."""
    client, estado = api
    estado["respuestas"] = [400, 200, 200]

    assert client.get("/api/forecast").status_code == 503
    assert estado["llamadas"] == 1


def test_health_no_llama_a_open_meteo(api):
    """Si la salud dependiera de un tercero, se pondría en rojo justo cuando
    el diseño de servir-datos-viejos está haciendo su trabajo."""
    client, estado = api

    cuerpo = client.get("/health").json()

    assert cuerpo == {
        "status": "ok", "cache": "cold",
        "fetched_at": None, "age_seconds": None, "stale": False,
    }
    assert estado["llamadas"] == 0


def test_refresh_forzado_tiene_suelo_de_60s(api):
    """Sin autenticación, ese suelo es lo único que frena un F5 repetido."""
    client, estado = api

    client.get("/api/forecast")
    r = client.post("/api/refresh?force=1").json()

    assert r["refreshed"] is False
    assert r["skipped_reason"] == "too_soon"
    assert estado["llamadas"] == 1  # no volvió a pedir
