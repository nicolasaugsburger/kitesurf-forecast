"""Tests del renderizado de hora local (`app.render`).

Este es el test que habría cazado el bug por el que guardamos UTC. Open-Meteo
aplica UN offset fijo a toda la serie, elegido en el momento de la petición: si
el horizonte cruza un cambio de horario, todas las horas del otro lado quedan
desplazadas una hora, sin duplicados, sin error y con valores verosímiles.

Los instantes están escritos a mano a propósito. Un fixture capturado hoy no
cruza ningún cambio de horario, así que no probaría nada de esto.
"""

from datetime import datetime, timezone

import pytest

from app.render import to_local_iso, to_utc_iso

# Cambios de horario en la UE (Europe/Madrid), ambos a las 01:00 UTC:
#   29 de marzo de 2026   -> CET (+01) pasa a CEST (+02)
#   25 de octubre de 2026 -> CEST (+02) vuelve a CET (+01)


def utc(*args) -> datetime:
    return datetime(*args, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "instante, esperado",
    [
        # --- octubre: CEST -> CET -------------------------------------
        (utc(2026, 10, 25, 0, 30), "2026-10-25T02:30:00+02:00"),
        (utc(2026, 10, 25, 1, 30), "2026-10-25T02:30:00+01:00"),  # misma pared, otro offset
        (utc(2026, 10, 25, 2, 30), "2026-10-25T03:30:00+01:00"),
        # --- marzo: CET -> CEST ---------------------------------------
        (utc(2026, 3, 29, 0, 30), "2026-03-29T01:30:00+01:00"),
        (utc(2026, 3, 29, 1, 30), "2026-03-29T03:30:00+02:00"),  # las 02:30 locales no existen
        # --- días normales --------------------------------------------
        (utc(2026, 9, 15, 12, 0), "2026-09-15T14:00:00+02:00"),  # verano
        (utc(2026, 1, 15, 12, 0), "2026-01-15T13:00:00+01:00"),  # invierno
    ],
)
def test_hora_local_respeta_el_cambio_de_horario(instante, esperado):
    assert to_local_iso(instante) == esperado


def test_la_hora_repetida_de_octubre_no_colisiona():
    """Los dos instantes que comparten reloj de pared deben seguir distinguiéndose.

    Es la razón de fondo para guardar UTC: con cadenas ingenuas ambos serían
    "2026-10-25T02:30" y ya no habría forma de separarlos.
    """
    primero = to_local_iso(utc(2026, 10, 25, 0, 30))
    segundo = to_local_iso(utc(2026, 10, 25, 1, 30))

    assert primero != segundo
    assert primero[:19] == segundo[:19]  # mismo reloj de pared...
    assert primero[19:] != segundo[19:]  # ...distinto offset


@pytest.mark.parametrize(
    "instante",
    [
        utc(2026, 10, 25, 1, 30),
        utc(2026, 3, 29, 1, 30),
        utc(2026, 9, 15, 12, 0),
    ],
)
def test_nunca_emitimos_cadenas_ingenuas(instante):
    """Un cliente puede quitar un offset; no puede inventárselo."""
    local = to_local_iso(instante)
    assert local[-6] in "+-" and local[-3] == ":"
    # y se puede volver al instante original sin ambigüedad
    assert datetime.fromisoformat(local) == instante


def test_utc_se_emite_con_z():
    assert to_utc_iso(utc(2026, 9, 15, 12, 0)) == "2026-09-15T12:00:00Z"
