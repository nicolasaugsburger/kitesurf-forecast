"""Rosa de los vientos: grados -> punto cardinal."""

# 16 puntos, en español
COMPASS_POINTS = [
    "Norte", "Nornoreste", "Noreste", "Estenoreste",
    "Este", "Estesureste", "Sureste", "Sursureste",
    "Sur", "Sursuroeste", "Suroeste", "Oestesuroeste",
    "Oeste", "Oestenoroeste", "Noroeste", "Nornoroeste",
]


def degrees_to_compass(degrees: float | None) -> str | None:
    """Convierte grados (0-360) al punto cardinal más cercano (rosa de 16 puntos).

    Devuelve None si no hay dato: Open-Meteo rellena con null más allá del
    horizonte del modelo, y `None % 360` reventaría.
    """
    if degrees is None:
        return None
    index = int((degrees % 360) / 22.5 + 0.5) % 16
    return COMPASS_POINTS[index]
