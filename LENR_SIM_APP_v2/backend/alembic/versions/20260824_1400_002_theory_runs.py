"""Add theory_runs table for pipeline persistence.

Revision ID: 002
Revises: 001
Create Date: 2026-08-24

Stores per-theory scores from auto-persisted and campaign pipeline runs.
Rows are model outputs, not laboratory experiments.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "theory_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(100), nullable=True, index=True),
        sa.Column("temperature_k", sa.Float(), default=300.0),
        sa.Column("loading_ratio", sa.Float(), default=0.9),
        sa.Column("pressure_pa", sa.Float(), default=101325.0),
        sa.Column("electron_density", sa.Float(), default=6.8e28),
        sa.Column("conditions", sa.JSON(), nullable=True),
        sa.Column("enabled_theories", sa.JSON(), nullable=True),
        sa.Column("theory_scores", sa.JSON(), nullable=True),
        sa.Column("combined_enhancement", sa.Float(), default=1.0),
        sa.Column("total_energy_watts", sa.Float(), default=0.0),
        sa.Column("top_theory_id", sa.String(100), nullable=True),
        sa.Column("top_theory_score", sa.Float(), default=0.0),
        sa.Column("validation_summary", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_theory_runs_session", "theory_runs", ["session_id"])
    op.create_index("ix_theory_runs_created", "theory_runs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_theory_runs_created", table_name="theory_runs")
    op.drop_index("ix_theory_runs_session", table_name="theory_runs")
    op.drop_table("theory_runs")
