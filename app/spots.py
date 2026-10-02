"""Los spots que comparamos.

Esta lista es la fuente de verdad. En la fase 2 se proyecta a la tabla `spots`
mediante una migración de datos: nunca se dan de alta spots por HTTP, así que
esto es configuración, no datos de usuario.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Spot:
    id: str
    name: str
    lat: float
    lon: float
    country: str


SPOTS: list[Spot] = [
    Spot("castelldefels", "Castelldefels", 41.2652, 1.9523, "ES"),
    Spot("barcelona", "Barcelona", 41.38, 2.19, "ES"),
    Spot("vilanova", "Vilanova", 41.21, 1.72, "ES"),
    Spot("trabucador", "Playa del Trabucador", 40.62, 0.68, "ES"),
    Spot("riumar", "Riumar", 40.73, 0.84, "ES"),
    Spot("sant_pere_pescador", "Sant Pere Pescador", 42.2, 3.11, "ES"),
    Spot("leucate", "Leucate", 42.84, 3.02, "FR"),
    Spot("saint_cyprien", "Saint-Cyprien", 42.64, 3.03, "FR"),
]
