"""Esquema inicial: spots, forecast_runs, forecast_hours.

Escrita a mano, no autogenerada: así se ve exactamente qué SQL se crea, y los
`alembic revision --autogenerate` posteriores parten de una base veraz.

Revision ID: 0001_initial
Create Date: 2026-10-02
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spots",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        # Lo que pedimos a Open-Meteo...
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        # ...y la celda que AROME devuelve de verdad, que no coincide.
        sa.Column("grid_latitude", sa.Float(), nullable=True),
        sa.Column("grid_longitude", sa.Float(), nullable=True),
        # Orientación de la playa, para clasificar offshore / side / onshore.
        # Vacía por ahora: faltan los valores reales de las 8 playas.
        sa.Column("shore_bearing", sa.SmallInteger(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "forecast_runs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        # De meta.json (paso 9). Nullable a propósito: no queremos que los
        # metadatos de la pasada sean una dependencia dura.
        sa.Column("model_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("model_modified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hours_ingested", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "forecast_runs_model_fetched_idx",
        "forecast_runs",
        ["model", sa.text("fetched_at DESC")],
    )

    op.create_table(
        "forecast_hours",
        sa.Column("run_id", sa.BigInteger(), nullable=False),
        sa.Column("spot_id", sa.Text(), nullable=False),
        # El instante pronosticado, siempre en UTC.
        sa.Column("valid_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("wind_speed_kn", sa.Float(), nullable=True),
        sa.Column("wind_gusts_kn", sa.Float(), nullable=True),
        sa.Column("wind_direction_deg", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["forecast_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["spot_id"], ["spots.id"]),
        # La unicidad vive AQUÍ. Un UNIQUE (spot_id, valid_time) sería el diseño
        # "solo el último" e impediría el histórico por construcción.
        sa.PrimaryKeyConstraint("run_id", "spot_id", "valid_time"),
    )
    op.create_index(
        "forecast_hours_lookup_idx",
        "forecast_hours",
        ["spot_id", sa.text("valid_time DESC"), sa.text("run_id DESC")],
    )
    op.create_index(
        "forecast_hours_compare_idx", "forecast_hours", ["valid_time", "spot_id"]
    )


def downgrade() -> None:
    op.drop_table("forecast_hours")
    op.drop_index("forecast_runs_model_fetched_idx", table_name="forecast_runs")
    op.drop_table("forecast_runs")
    op.drop_table("spots")
