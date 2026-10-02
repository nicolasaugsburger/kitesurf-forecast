"""Siembra los spots desde app/spots.py.

La lista de Python sigue siendo la fuente de verdad; la tabla existe para la
integridad referencial y los joins, no para dar de alta spots por HTTP.

Es un UPSERT a propósito: si mañana se añade un spot a `app/spots.py`, basta una
migración nueva que vuelva a llamar a esta siembra, sin romper las filas que ya
existen ni duplicar nada.

Revision ID: 0002_seed_spots
Create Date: 2026-10-02
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import insert

from app.spots import SPOTS

revision = "0002_seed_spots"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

# Tabla declarada aquí, mínima y a mano: una migración no debe importar el
# modelo ORM, porque entonces quedaría atada a cómo sea ese modelo en el futuro
# en vez de a cómo es el esquema en este punto de la historia.
spots_table = sa.table(
    "spots",
    sa.column("id", sa.Text),
    sa.column("name", sa.Text),
    sa.column("country", sa.String),
    sa.column("latitude", sa.Float),
    sa.column("longitude", sa.Float),
)


def upgrade() -> None:
    filas = [
        {
            "id": s.id,
            "name": s.name,
            "country": s.country,
            "latitude": s.lat,
            "longitude": s.lon,
        }
        for s in SPOTS
    ]
    stmt = insert(spots_table).values(filas)
    op.execute(
        stmt.on_conflict_do_update(
            index_elements=["id"],
            set_={
                "name": stmt.excluded.name,
                "country": stmt.excluded.country,
                "latitude": stmt.excluded.latitude,
                "longitude": stmt.excluded.longitude,
            },
        )
    )


def downgrade() -> None:
    op.execute(
        spots_table.delete().where(spots_table.c.id.in_([s.id for s in SPOTS]))
    )
