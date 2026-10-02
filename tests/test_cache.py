"""Tests de la política de caché (`app.cache.should_refresh`).

La función es pura justamente para esto: se prueba sin parchear el reloj, sin
base de datos y sin levantar la app. En la fase 2 sobrevive tal cual; lo único
que cambia es de dónde sale `fetched_at`.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.cache import should_refresh

TTL = timedelta(minutes=30)
AHORA = datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc)


def hace(minutos: float) -> datetime:
    return AHORA - timedelta(minutes=minutos)


@pytest.mark.parametrize(
    "fetched_at, esperado, motivo",
    [
        (None, True, "caché fría: no hay nada que servir"),
        (hace(0), False, "recién pedido"),
        (hace(29.9), False, "dentro del TTL"),
        (hace(30), True, "justo en el TTL: la frontera es >=, refresca"),
        (hace(30.1), True, "pasado el TTL"),
        (hace(60 * 24), True, "muy viejo"),
    ],
)
def test_politica_de_refresco(fetched_at, esperado, motivo):
    assert should_refresh(fetched_at, AHORA, TTL) is esperado, motivo


def test_force_refresca_aunque_este_fresca():
    """Si `force` no ignorase el TTL, el refresco manual no serviría de nada."""
    assert should_refresh(hace(0), AHORA, TTL) is False
    assert should_refresh(hace(0), AHORA, TTL, force=True) is True


def test_force_con_cache_fria():
    assert should_refresh(None, AHORA, TTL, force=True) is True


def test_el_ttl_es_un_parametro_no_una_constante():
    """Con otro TTL, la misma antigüedad da otra respuesta."""
    cinco_min = timedelta(minutes=5)
    assert should_refresh(hace(10), AHORA, TTL) is False
    assert should_refresh(hace(10), AHORA, cinco_min) is True
