# Kitesurf Forecast

Compara el pronóstico de viento de 8 spots de kitesurf (área de Barcelona y sur
de Francia) en una sola vista, en lugar de mirarlos uno a uno en Windguru.

Datos de [Open-Meteo](https://open-meteo.com), forzando el modelo
**AROME France HD** (Météo-France, 1.5 km), en nudos y hora local de Madrid para
poder comparar directamente contra Windguru.

## Arrancar

```bash
python -m venv venv && venv/Scripts/activate   # Windows
pip install -r requirements.txt

docker compose up -d          # Postgres en el puerto 5433
alembic upgrade head          # esquema + los 8 spots

uvicorn app.main:app --reload
```

Documentación interactiva en http://localhost:8000/docs

## Endpoints

| | |
|---|---|
| `GET /health` | estado y antigüedad de la caché. No llama a Open-Meteo. |
| `GET /api/spots` | los 8 spots |
| `GET /api/forecast` | todos los spots — la vista de comparación |
| `GET /api/forecast?spots=leucate,riumar&hours=24` | filtrado y recortado |
| `GET /api/forecast/{spot_id}` | un solo spot |
| `POST /api/refresh?force=1` | fuerza el refresco (suelo de 60 s) |

## Decisiones que conviene conocer

- **Los instantes se guardan en UTC y se renderizan en local.** Open-Meteo
  aplica un offset fijo a toda la serie, así que sus etiquetas locales se
  desvían una hora tras un cambio de horario, en silencio. Pedimos
  `timeformat=unixtime` y convertimos nosotros.
- **Los 8 spots se piden en una sola petición** (coordenadas separadas por
  comas). El elemento 0 de la respuesta no trae `location_id`, así que el
  emparejamiento es por posición.
- **La rosa de los vientos no se almacena**: es presentación, se calcula al
  renderizar.
- **Caché en memoria con TTL de 30 min.** Open-Meteo no expone cabeceras de
  caché, así que la frescura la lleva la app. Un fallo al refrescar nunca
  tumba una lectura: se sirve la última copia buena.

## Tests

```bash
pytest
```

Open-Meteo se falsea con `httpx.MockTransport`, por debajo del cliente, para que
el código recorra su camino real (reintentos incluidos).

## Base de datos

Tres tablas, y la división entre ellas separa dos requisitos que es fácil
confundir:

- `forecast_runs` -> "¿cuándo pedí los datos por última vez?" = **caché**
- `forecast_hours` -> "¿cómo cambió el pronóstico de esta hora?" = **histórico**

La clave primaria de `forecast_hours` es `(run_id, spot_id, valid_time)`. Un
`UNIQUE (spot_id, valid_time)` sería el diseño "guarda solo el último" e
impediría el histórico por construcción: por eso no está.

La primera migración está escrita a mano, no autogenerada, para que se vea
exactamente qué SQL existe.

## Estado

Fase 1 (API sobre Open-Meteo) completa. Esquema de Postgres creado y sembrado;
la app todavía no lee ni escribe en él. Siguiente: persistir cada pasada.
