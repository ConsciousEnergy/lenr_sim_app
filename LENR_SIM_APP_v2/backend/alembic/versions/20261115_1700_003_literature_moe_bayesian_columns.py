"""Add literature / MoE / Bayesian columns on experiments.

Revision ID: 003
Revises: 002
Create Date: 2026-11-15

First-class queryable fields for cite-gated calorimetry significance
(σ_Q provenance, S_heat, discovery_grade_eligible) plus literature
association keys. Values remain nullable — refuse fabricated MoE.
discovery_grade_eligible never implies lenr_proved or EQ-OPEN closure.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Literature association (indexed for analytics / campaign slices)
    op.add_column(
        "experiments",
        sa.Column("literature_id", sa.String(120), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("claim_tag", sa.String(40), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("citation_key", sa.String(120), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("doi", sa.String(200), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("open_question_ids", sa.JSON(), nullable=True),
    )

    # Cite-gated calorimetry MoE (nullable; never invent literature_reported σ_Q)
    op.add_column(
        "experiments",
        sa.Column("sigma_q_w", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("sigma_q_statistical_w", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("sigma_q_systematic_w", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("sigma_q_instrument_floor_w", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("sigma_q_relative_fraction", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("moe_provenance", sa.String(80), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("moe_citation_keys", sa.JSON(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("moe_notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column("moe_sigma_q_pairing_verified", sa.Boolean(), nullable=True),
    )

    # Bayesian / significance analytics flags (S_heat = Q/σ_Q; ≥5σ flag only)
    op.add_column(
        "experiments",
        sa.Column("s_heat", sa.Float(), nullable=True),
    )
    op.add_column(
        "experiments",
        sa.Column(
            "discovery_grade_eligible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        "experiments",
        sa.Column("bayesian_summary", sa.JSON(), nullable=True),
    )

    op.create_index(
        "ix_experiments_literature_id",
        "experiments",
        ["literature_id"],
    )
    op.create_index(
        "ix_experiments_claim_tag",
        "experiments",
        ["claim_tag"],
    )
    op.create_index(
        "ix_experiments_citation_key",
        "experiments",
        ["citation_key"],
    )
    op.create_index(
        "ix_experiments_moe_provenance",
        "experiments",
        ["moe_provenance"],
    )
    op.create_index(
        "ix_experiments_discovery_grade",
        "experiments",
        ["discovery_grade_eligible"],
    )
    op.create_index(
        "ix_experiments_lit_claim",
        "experiments",
        ["literature_id", "claim_tag"],
    )

    # Optional typed payload on analytics snapshots (Bayesian / MoE aggregates)
    op.add_column(
        "analytics_snapshots",
        sa.Column("bayesian_summary", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analytics_snapshots", "bayesian_summary")

    op.drop_index("ix_experiments_lit_claim", table_name="experiments")
    op.drop_index("ix_experiments_discovery_grade", table_name="experiments")
    op.drop_index("ix_experiments_moe_provenance", table_name="experiments")
    op.drop_index("ix_experiments_citation_key", table_name="experiments")
    op.drop_index("ix_experiments_claim_tag", table_name="experiments")
    op.drop_index("ix_experiments_literature_id", table_name="experiments")

    for column in (
        "bayesian_summary",
        "discovery_grade_eligible",
        "s_heat",
        "moe_sigma_q_pairing_verified",
        "moe_notes",
        "moe_citation_keys",
        "moe_provenance",
        "sigma_q_relative_fraction",
        "sigma_q_instrument_floor_w",
        "sigma_q_systematic_w",
        "sigma_q_statistical_w",
        "sigma_q_w",
        "open_question_ids",
        "doi",
        "citation_key",
        "claim_tag",
        "literature_id",
    ):
        op.drop_column("experiments", column)
