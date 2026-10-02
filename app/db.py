"""Motor y sesiones de SQLAlchemy (async).

`expire_on_commit=False` porque, tras un commit, SQLAlchemy por defecto marca
los objetos como caducados y vuelve a consultarlos al siguiente acceso. En
código async eso dispara una carga perezosa fuera del contexto correcto y
revienta con `MissingGreenlet`, que es el error más desconcertante que se
encuentra uno aquí.
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependencia de FastAPI: una sesión por petición."""
    async with SessionLocal() as session:
        yield session
