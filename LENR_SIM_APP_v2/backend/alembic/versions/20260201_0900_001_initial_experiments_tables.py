"""Initial experiments tables

Revision ID: 001
Revises: 
Create Date: 2026-02-01 09:00:00.000000

Creates tables for:
- experiments: Core experiment/simulation storage
- experiment_timelines: Time-series data points
- analytics_snapshots: Cached aggregate statistics
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create experiments table
    op.create_table(
        'experiments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('experiment_type', sa.String(50), default='lenr', index=True),
        sa.Column('status', sa.String(20), default='completed', index=True),
        sa.Column('session_id', sa.String(100), nullable=True, index=True),
        sa.Column('is_baseline', sa.Boolean(), default=False, index=True),
        sa.Column('source', sa.String(255), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),
        
        # Parameters
        sa.Column('material', sa.String(50), default='palladium', index=True),
        sa.Column('temperature_k', sa.Float(), default=300.0),
        sa.Column('pressure_bar', sa.Float(), default=1.0),
        sa.Column('loading_ratio', sa.Float(), nullable=True),
        sa.Column('defect_density', sa.Float(), nullable=True),
        sa.Column('driving_frequency_khz', sa.Float(), nullable=True),
        sa.Column('parameters_json', sa.JSON(), nullable=True),
        
        # Results
        sa.Column('enhancement_factor', sa.Float(), nullable=True),
        sa.Column('fusion_rate', sa.Float(), nullable=True),
        sa.Column('energy_output_kev', sa.Float(), nullable=True),
        sa.Column('excess_heat_watts', sa.Float(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('results_json', sa.JSON(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create composite indexes for experiments
    op.create_index('ix_experiments_type_status', 'experiments', ['experiment_type', 'status'])
    op.create_index('ix_experiments_material_temp', 'experiments', ['material', 'temperature_k'])
    op.create_index('ix_experiments_created_baseline', 'experiments', ['created_at', 'is_baseline'])
    
    # Create experiment_timelines table
    op.create_table(
        'experiment_timelines',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('experiment_id', sa.String(36), sa.ForeignKey('experiments.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('timestamp_ms', sa.Integer(), nullable=False),
        sa.Column('enhancement_factor', sa.Float(), nullable=True),
        sa.Column('temperature_k', sa.Float(), nullable=True),
        sa.Column('pressure_bar', sa.Float(), nullable=True),
        sa.Column('energy_output', sa.Float(), nullable=True),
        sa.Column('data_json', sa.JSON(), nullable=True),
    )
    
    # Create composite index for timeline queries
    op.create_index('ix_timeline_experiment_time', 'experiment_timelines', ['experiment_id', 'timestamp_ms'])
    
    # Create analytics_snapshots table
    op.create_table(
        'analytics_snapshots',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('snapshot_type', sa.String(50), nullable=False, index=True),
        sa.Column('scope', sa.String(100), default='all', index=True),
        sa.Column('total_experiments', sa.Integer(), default=0),
        sa.Column('completed_count', sa.Integer(), default=0),
        sa.Column('failed_count', sa.Integer(), default=0),
        sa.Column('success_rate', sa.Float(), default=0.0),
        sa.Column('avg_enhancement_factor', sa.Float(), default=0.0),
        sa.Column('max_enhancement_factor', sa.Float(), default=0.0),
        sa.Column('total_energy_output', sa.Float(), default=0.0),
        sa.Column('type_distribution', sa.JSON(), nullable=True),
        sa.Column('material_distribution', sa.JSON(), nullable=True),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create composite index for snapshots
    op.create_index('ix_snapshots_type_scope', 'analytics_snapshots', ['snapshot_type', 'scope'])


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_snapshots_type_scope', table_name='analytics_snapshots')
    op.drop_index('ix_timeline_experiment_time', table_name='experiment_timelines')
    op.drop_index('ix_experiments_created_baseline', table_name='experiments')
    op.drop_index('ix_experiments_material_temp', table_name='experiments')
    op.drop_index('ix_experiments_type_status', table_name='experiments')
    
    # Drop tables
    op.drop_table('analytics_snapshots')
    op.drop_table('experiment_timelines')
    op.drop_table('experiments')
