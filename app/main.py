"""Aplicación FastAPI.

El cliente httpx y la caché viven en el `lifespan`, no como globales creadas al
importar: así se crean una vez al arrancar, se cierran limpiamente al parar, y
el pool de conexiones se reutiliza entre peticiones (frente a `requests`, que
rehace el handshake TLS en cada llamada).
"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cache import ForecastCache
from app.config import settings
from app.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(
        headers={"User-Agent": settings.user_agent},
        timeout=httpx.Timeout(
            connect=settings.http_connect_timeout,
            read=settings.http_read_timeout,
            write=5.0,
            pool=5.0,
        ),
    )
    app.state.cache = ForecastCache()
    try:
        yield
    finally:
        await app.state.http.aclose()


app = FastAPI(
    title="Kitesurf Forecast",
    description="Compara el pronóstico de viento de varios spots de kitesurf.",
    version="0.1.0",
    lifespan=lifespan,
)
# Sin esto el navegador bloquea al front: vive en otro puerto, asi que para la
# politica de mismo origen es otro sitio. Ojo, curl NO lo nota: CORS lo aplica
# el navegador, no el servidor.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(router)
