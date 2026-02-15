"""
SQLAlchemy Database Models for LENR Simulation App

v0.2.3-beta: Database models for storing experiment results and analytics data.

These models support:
- Baseline LENR experiment data from published research
- User simulation results
- Time-series data for enhancement factor tracking
"""

import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, 
    ForeignKey, Text, Enum, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class ExperimentType(str, PyEnum):
    """Types of LENR experiments/simulations."""
    QUANTUM_TUNNELING = "quantum_tunneling"
    FUSION = "fusion"
    LENR = "lenr"
    BUBBLE_FUSION = "bubble_fusion"
    UNIFIED_THEORY = "unified_theory"
    CUSTOM = "custom"


class ExperimentStatus(str, PyEnum):
    """Status of an experiment/simulation run."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MaterialType(str, PyEnum):
    """Host materials used in LENR experiments."""
    PALLADIUM = "palladium"
    NICKEL = "nickel"
    TITANIUM = "titanium"
    PLATINUM = "platinum"
    TUNGSTEN = "tungsten"
    COPPER = "copper"
    OTHER = "other"


class Experiment(Base):
    """
    Core model for LENR experiments and simulation results.
    
    Stores both baseline data from published experiments and 
    user-generated simulation results.
    """
    __tablename__ = "experiments"
    
    # Primary key - UUID for distributed-friendly IDs
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    
    # Basic metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Experiment classification
    experiment_type: Mapped[str] = mapped_column(
        String(50), 
        default=ExperimentType.LENR.value,
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default=ExperimentStatus.COMPLETED.value,
        index=True
    )
    
    # User tracking (session-based, not auth)
    session_id: Mapped[Optional[str]] = mapped_column(
        String(100), 
        nullable=True,
        index=True
    )
    
    # Baseline vs user data flag
    is_baseline: Mapped[bool] = mapped_column(
        Boolean, 
        default=False,
        index=True
    )
    
    # Source attribution for baseline data
    source: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True
    )  # e.g., "Fleischmann-Pons 1989", "User Simulation"
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # ==================
    # Experiment Parameters
    # ==================
    
    # Material configuration
    material: Mapped[str] = mapped_column(
        String(50), 
        default=MaterialType.PALLADIUM.value,
        index=True
    )
    
    # Physical conditions
    temperature_k: Mapped[float] = mapped_column(Float, default=300.0)
    pressure_bar: Mapped[float] = mapped_column(Float, default=1.0)
    
    # LENR-specific parameters
    loading_ratio: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    defect_density: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    driving_frequency_khz: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Additional parameters stored as JSON
    parameters_json: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        nullable=True,
        default=dict
    )
    
    # ==================
    # Results
    # ==================
    
    enhancement_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fusion_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy_output_kev: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    excess_heat_watts: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Duration of experiment/simulation
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Detailed results stored as JSON
    results_json: Mapped[Optional[dict]] = mapped_column(
        JSON, 
        nullable=True,
        default=dict
    )
    
    # ==================
    # Timestamps
    # ==================
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # ==================
    # Relationships
    # ==================
    
    timeline_points: Mapped[List["ExperimentTimeline"]] = relationship(
        "ExperimentTimeline",
        back_populates="experiment",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    # ==================
    # Indexes
    # ==================
    
    __table_args__ = (
        Index('ix_experiments_type_status', 'experiment_type', 'status'),
        Index('ix_experiments_material_temp', 'material', 'temperature_k'),
        Index('ix_experiments_created_baseline', 'created_at', 'is_baseline'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "type": self.experiment_type,
            "status": self.status,
            "session_id": self.session_id,
            "is_baseline": self.is_baseline,
            "source": self.source,
            "source_url": self.source_url,
            "material": self.material,
            "temperature_k": self.temperature_k,
            "pressure_bar": self.pressure_bar,
            "loading_ratio": self.loading_ratio,
            "defect_density": self.defect_density,
            "driving_frequency_khz": self.driving_frequency_khz,
            "parameters": self.parameters_json or {},
            "enhancement_factor": self.enhancement_factor,
            "fusion_rate": self.fusion_rate,
            "energy_output_kev": self.energy_output_kev,
            "excess_heat_watts": self.excess_heat_watts,
            "duration_seconds": self.duration_seconds,
            "results": self.results_json or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ExperimentTimeline(Base):
    """
    Time-series data for experiment/simulation runs.
    
    Captures enhancement factor, temperature, and energy output
    over the course of an experiment for charting purposes.
    """
    __tablename__ = "experiment_timelines"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    
    experiment_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("experiments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Time within the experiment (relative, in milliseconds)
    timestamp_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Measured/calculated values at this time point
    enhancement_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    temperature_k: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pressure_bar: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    energy_output: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Additional data point values as JSON
    data_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationship back to experiment
    experiment: Mapped["Experiment"] = relationship(
        "Experiment",
        back_populates="timeline_points"
    )
    
    __table_args__ = (
        Index('ix_timeline_experiment_time', 'experiment_id', 'timestamp_ms'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "experiment_id": self.experiment_id,
            "timestamp_ms": self.timestamp_ms,
            "enhancement_factor": self.enhancement_factor,
            "temperature_k": self.temperature_k,
            "pressure_bar": self.pressure_bar,
            "energy_output": self.energy_output,
            "data": self.data_json or {},
        }


class AnalyticsSnapshot(Base):
    """
    Cached analytics snapshots for dashboard performance.
    
    Pre-computed aggregate statistics to avoid expensive queries
    on every dashboard load.
    """
    __tablename__ = "analytics_snapshots"
    
    id: Mapped[str] = mapped_column(
        String(36), 
        primary_key=True, 
        default=lambda: str(uuid.uuid4())
    )
    
    # Snapshot type (e.g., "daily", "weekly", "all_time")
    snapshot_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # Scope (e.g., "all", specific session_id)
    scope: Mapped[str] = mapped_column(String(100), default="all", index=True)
    
    # Aggregate statistics
    total_experiments: Mapped[int] = mapped_column(Integer, default=0)
    completed_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    
    avg_enhancement_factor: Mapped[float] = mapped_column(Float, default=0.0)
    max_enhancement_factor: Mapped[float] = mapped_column(Float, default=0.0)
    total_energy_output: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Type distribution as JSON
    type_distribution: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Material distribution as JSON  
    material_distribution: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    
    __table_args__ = (
        Index('ix_snapshots_type_scope', 'snapshot_type', 'scope'),
    )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "snapshot_type": self.snapshot_type,
            "scope": self.scope,
            "total_experiments": self.total_experiments,
            "completed_count": self.completed_count,
            "failed_count": self.failed_count,
            "success_rate": self.success_rate,
            "avg_enhancement_factor": self.avg_enhancement_factor,
            "max_enhancement_factor": self.max_enhancement_factor,
            "total_energy_output": self.total_energy_output,
            "type_distribution": self.type_distribution or {},
            "material_distribution": self.material_distribution or {},
            "computed_at": self.computed_at.isoformat() if self.computed_at else None,
        }


class TheoryRun(Base):
    """
    Persists the results of running the theory pipeline.

    Each row records the conditions, which theories were enabled,
    the per-theory scores and contributions, and a summary of the
    combined result.  Used by the analytics dashboard to track
    theory performance over time and across parameter regimes.

    v0.3.1-beta: Initial implementation for theory run persistence.
    """
    __tablename__ = "theory_runs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # Session tracking
    session_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True,
    )

    # Physical conditions used
    temperature_k: Mapped[float] = mapped_column(Float, default=300.0)
    loading_ratio: Mapped[float] = mapped_column(Float, default=0.9)
    pressure_pa: Mapped[float] = mapped_column(Float, default=101325.0)
    electron_density: Mapped[float] = mapped_column(Float, default=6.8e28)

    # Full conditions JSON (includes any extra parameters)
    conditions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Theories that were enabled for this run
    enabled_theories: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Per-theory results (theory_id -> {score, enhancement, confidence, ...})
    theory_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Combined / summary results
    combined_enhancement: Mapped[float] = mapped_column(Float, default=1.0)
    total_energy_watts: Mapped[float] = mapped_column(Float, default=0.0)
    top_theory_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    top_theory_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Validation report summary
    validation_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    __table_args__ = (
        Index("ix_theory_runs_session", "session_id"),
        Index("ix_theory_runs_created", "created_at"),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "temperature_k": self.temperature_k,
            "loading_ratio": self.loading_ratio,
            "pressure_pa": self.pressure_pa,
            "electron_density": self.electron_density,
            "conditions": self.conditions or {},
            "enabled_theories": self.enabled_theories or [],
            "theory_scores": self.theory_scores or {},
            "combined_enhancement": self.combined_enhancement,
            "total_energy_watts": self.total_energy_watts,
            "top_theory_id": self.top_theory_id,
            "top_theory_score": self.top_theory_score,
            "validation_summary": self.validation_summary or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
