"""
Analytics Service for LENR Simulation App

Business logic for computing statistics, managing experiments,
and generating analytics data for the dashboard.

v0.2.3-beta: Initial implementation with full CRUD and aggregation support.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from collections import defaultdict

from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database_models import (
    Experiment, 
    ExperimentTimeline, 
    AnalyticsSnapshot,
    ExperimentType,
    ExperimentStatus,
    MaterialType,
)
from app.services.simulation_persistence import SHARED_SOURCES

logger = logging.getLogger(__name__)


def _visibility_clause(session_id: Optional[str], include_baseline: bool = True):
    """Filter experiments visible on the dashboard.

    Auto-persisted and campaign rows are shared model outputs (not user-session
    private and not literature baselines). They appear whenever baseline/shared
    data is included so Analytics Overview/History populate after a campaign.
    """
    if not session_id:
        return None
    if not include_baseline:
        return Experiment.session_id == session_id
    return or_(
        Experiment.session_id == session_id,
        Experiment.is_baseline == True,  # noqa: E712
        Experiment.source.in_(list(SHARED_SOURCES)),
    )


class AnalyticsService:
    """
    Service for analytics operations on experiment data.
    
    Provides methods for:
    - Dashboard statistics computation
    - Experiment CRUD operations
    - Timeline data for charts
    - Type and material distributions
    - Data export
    """
    
    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
    
    # ==================
    # Statistics Methods
    # ==================
    
    async def get_statistics(
        self,
        session_id: Optional[str] = None,
        include_baseline: bool = True,
    ) -> Dict[str, Any]:
        """
        Compute aggregate statistics for the dashboard.
        
        Args:
            session_id: If provided, filter to user's experiments
            include_baseline: Whether to include baseline data in stats
            
        Returns:
            Dictionary with totalSimulations, successRate, avgEnhancement, totalEnergy
        """
        # Build base query
        query = select(Experiment)
        
        filters = []
        visibility = _visibility_clause(session_id, include_baseline)
        if visibility is not None:
            filters.append(visibility)
        
        if filters:
            query = query.where(and_(*filters))
        
        result = await self.session.execute(query)
        experiments = result.scalars().all()
        
        if not experiments:
            return {
                "totalSimulations": 0,
                "successRate": 0.0,
                "avgEnhancement": 0.0,
                "totalEnergy": 0.0,
                "maxEnhancement": 0.0,
                "completedCount": 0,
                "failedCount": 0,
            }
        
        total = len(experiments)
        completed = sum(1 for e in experiments if e.status == ExperimentStatus.COMPLETED.value)
        failed = sum(1 for e in experiments if e.status == ExperimentStatus.FAILED.value)
        
        enhancement_values = [
            e.enhancement_factor for e in experiments 
            if e.enhancement_factor is not None
        ]
        energy_values = [
            e.energy_output_kev for e in experiments 
            if e.energy_output_kev is not None
        ]
        
        avg_enhancement = sum(enhancement_values) / len(enhancement_values) if enhancement_values else 0.0
        max_enhancement = max(enhancement_values) if enhancement_values else 0.0
        total_energy = sum(energy_values) if energy_values else 0.0
        
        success_rate = (completed / total * 100) if total > 0 else 0.0
        
        return {
            "totalSimulations": total,
            "successRate": round(success_rate, 1),
            "avgEnhancement": round(avg_enhancement, 2),
            "totalEnergy": round(total_energy, 2),
            "maxEnhancement": round(max_enhancement, 2),
            "completedCount": completed,
            "failedCount": failed,
        }
    
    async def get_type_distribution(
        self,
        session_id: Optional[str] = None,
        include_baseline: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Get distribution of experiment types for pie chart.
        
        Returns:
            List of {name, value, percentage} for each type
        """
        query = select(
            Experiment.experiment_type,
            func.count(Experiment.id).label('count')
        ).group_by(Experiment.experiment_type)
        
        if session_id and not include_baseline:
            query = query.where(Experiment.session_id == session_id)
        elif session_id:
            query = query.where(
                or_(
                    Experiment.session_id == session_id,
                    Experiment.is_baseline == True,  # noqa: E712
                    Experiment.source.in_(list(SHARED_SOURCES)),
                )
            )
        
        result = await self.session.execute(query)
        rows = result.all()
        
        total = sum(row.count for row in rows)
        
        # Map experiment types to display names
        type_names = {
            'quantum_tunneling': 'Quantum Tunneling',
            'fusion': 'Fusion',
            'lenr': 'LENR',
            'bubble_fusion': 'Bubble Fusion',
            'unified_theory': 'Unified Theory',
            'custom': 'Custom',
        }
        
        distribution = []
        for row in rows:
            display_name = type_names.get(row.experiment_type, row.experiment_type.title())
            percentage = (row.count / total * 100) if total > 0 else 0
            distribution.append({
                "name": display_name,
                "value": row.count,
                "percentage": round(percentage, 1),
            })
        
        return sorted(distribution, key=lambda x: x['value'], reverse=True)
    
    async def get_material_distribution(
        self,
        session_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get distribution of materials used."""
        query = select(
            Experiment.material,
            func.count(Experiment.id).label('count')
        ).group_by(Experiment.material)
        
        if session_id:
            query = query.where(
                or_(
                    Experiment.session_id == session_id,
                    Experiment.is_baseline == True,  # noqa: E712
                    Experiment.source.in_(list(SHARED_SOURCES)),
                )
            )
        
        result = await self.session.execute(query)
        rows = result.all()
        
        total = sum(row.count for row in rows)
        
        return [
            {
                "name": row.material.title(),
                "value": row.count,
                "percentage": round((row.count / total * 100) if total > 0 else 0, 1),
            }
            for row in sorted(rows, key=lambda x: x.count, reverse=True)
        ]
    
    # ==================
    # Timeline Methods
    # ==================
    
    async def get_timeline_data(
        self,
        session_id: Optional[str] = None,
        limit: int = 30,
        include_baseline: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Get time-series data for enhancement factor over time chart.
        
        Returns experiments sorted by date with enhancement and energy values.
        """
        query = select(Experiment).order_by(desc(Experiment.created_at)).limit(limit)
        
        if session_id and not include_baseline:
            query = query.where(Experiment.session_id == session_id)
        elif session_id:
            query = query.where(
                or_(
                    Experiment.session_id == session_id,
                    Experiment.is_baseline == True,  # noqa: E712
                    Experiment.source.in_(list(SHARED_SOURCES)),
                )
            )
        
        result = await self.session.execute(query)
        experiments = result.scalars().all()
        
        # Reverse to show oldest first for time series
        experiments = list(reversed(experiments))
        
        return [
            {
                "date": e.created_at.strftime("%Y-%m-%d") if e.created_at else "Unknown",
                "name": e.name,
                "enhancementFactor": e.enhancement_factor or 0,
                "energyOutput": e.energy_output_kev or 0,
                "type": e.experiment_type,
                "status": e.status,
            }
            for e in experiments
        ]
    
    async def get_temperature_distribution(
        self,
        session_id: Optional[str] = None,
        bins: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get temperature distribution for bar chart.
        
        Bins temperatures into ranges.
        """
        query = select(Experiment.temperature_k)
        
        if session_id:
            query = query.where(
                or_(
                    Experiment.session_id == session_id,
                    Experiment.is_baseline == True,  # noqa: E712
                    Experiment.source.in_(list(SHARED_SOURCES)),
                )
            )
        
        result = await self.session.execute(query)
        temperatures = [row[0] for row in result.all() if row[0] is not None]
        
        if not temperatures:
            return []
        
        min_temp = min(temperatures)
        max_temp = max(temperatures)
        bin_width = (max_temp - min_temp) / bins if max_temp > min_temp else 100
        
        distribution = defaultdict(int)
        for temp in temperatures:
            bin_index = int((temp - min_temp) / bin_width) if bin_width > 0 else 0
            bin_index = min(bin_index, bins - 1)  # Cap at last bin
            bin_start = min_temp + bin_index * bin_width
            distribution[f"{int(bin_start)}-{int(bin_start + bin_width)}K"] += 1
        
        return [
            {"range": k, "count": v}
            for k, v in sorted(distribution.items(), key=lambda x: int(x[0].split('-')[0]))
        ]
    
    # ==================
    # CRUD Operations
    # ==================
    
    async def get_experiments(
        self,
        session_id: Optional[str] = None,
        include_baseline: bool = True,
        experiment_type: Optional[str] = None,
        status: Optional[str] = None,
        material: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get paginated list of experiments with filtering.
        
        Returns:
            Tuple of (experiments list, total count)
        """
        # Build filters
        filters = []
        
        if session_id and not include_baseline:
            filters.append(Experiment.session_id == session_id)
        elif session_id:
            filters.append(
                or_(
                    Experiment.session_id == session_id,
                    Experiment.is_baseline == True,  # noqa: E712
                    Experiment.source.in_(list(SHARED_SOURCES)),
                )
            )
        
        if experiment_type:
            filters.append(Experiment.experiment_type == experiment_type)
        if status:
            filters.append(Experiment.status == status)
        if material:
            filters.append(Experiment.material == material)
        
        # Count query
        count_query = select(func.count(Experiment.id))
        if filters:
            count_query = count_query.where(and_(*filters))
        
        count_result = await self.session.execute(count_query)
        total = count_result.scalar() or 0
        
        # Main query with sorting and pagination
        query = select(Experiment)
        if filters:
            query = query.where(and_(*filters))
        
        # Sorting
        sort_column = getattr(Experiment, sort_by, Experiment.created_at)
        if sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(sort_column)
        
        query = query.offset(offset).limit(limit)
        
        result = await self.session.execute(query)
        experiments = result.scalars().all()
        
        return [e.to_dict() for e in experiments], total
    
    async def get_experiment(self, experiment_id: str) -> Optional[Dict[str, Any]]:
        """Get a single experiment by ID."""
        query = select(Experiment).where(Experiment.id == experiment_id)
        result = await self.session.execute(query)
        experiment = result.scalar_one_or_none()
        
        if experiment:
            return experiment.to_dict()
        return None
    
    async def create_experiment(
        self,
        name: str,
        experiment_type: str,
        session_id: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new experiment record.
        
        Args:
            name: Experiment name
            experiment_type: Type of experiment
            session_id: User session ID
            **kwargs: Additional experiment fields
            
        Returns:
            Created experiment as dictionary
        """
        experiment = Experiment(
            id=str(uuid.uuid4()),
            name=name,
            experiment_type=experiment_type,
            session_id=session_id,
            status=kwargs.get('status', ExperimentStatus.COMPLETED.value),
            is_baseline=kwargs.get('is_baseline', False),
            source=kwargs.get('source', 'User Simulation'),
            material=kwargs.get('material', MaterialType.PALLADIUM.value),
            temperature_k=kwargs.get('temperature_k', 300.0),
            pressure_bar=kwargs.get('pressure_bar', 1.0),
            loading_ratio=kwargs.get('loading_ratio'),
            defect_density=kwargs.get('defect_density'),
            driving_frequency_khz=kwargs.get('driving_frequency_khz'),
            parameters_json=kwargs.get('parameters', {}),
            enhancement_factor=kwargs.get('enhancement_factor'),
            fusion_rate=kwargs.get('fusion_rate'),
            energy_output_kev=kwargs.get('energy_output_kev'),
            excess_heat_watts=kwargs.get('excess_heat_watts'),
            duration_seconds=kwargs.get('duration_seconds'),
            results_json=kwargs.get('results', {}),
        )
        
        self.session.add(experiment)
        await self.session.commit()
        await self.session.refresh(experiment)
        
        logger.info(f"Created experiment: {experiment.id} - {experiment.name}")
        
        return experiment.to_dict()
    
    async def update_experiment(
        self,
        experiment_id: str,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """Update an existing experiment."""
        query = select(Experiment).where(Experiment.id == experiment_id)
        result = await self.session.execute(query)
        experiment = result.scalar_one_or_none()
        
        if not experiment:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(experiment, key) and value is not None:
                setattr(experiment, key, value)
        
        experiment.updated_at = datetime.utcnow()
        
        await self.session.commit()
        await self.session.refresh(experiment)
        
        return experiment.to_dict()
    
    async def delete_experiment(self, experiment_id: str) -> bool:
        """Delete an experiment (and associated timeline data via cascade)."""
        query = select(Experiment).where(Experiment.id == experiment_id)
        result = await self.session.execute(query)
        experiment = result.scalar_one_or_none()
        
        if not experiment:
            return False
        
        await self.session.delete(experiment)
        await self.session.commit()
        
        logger.info(f"Deleted experiment: {experiment_id}")
        
        return True
    
    # ==================
    # Timeline CRUD
    # ==================
    
    async def add_timeline_points(
        self,
        experiment_id: str,
        points: List[Dict[str, Any]]
    ) -> int:
        """
        Add timeline data points to an experiment.
        
        Args:
            experiment_id: ID of the experiment
            points: List of {timestamp_ms, enhancement_factor, temperature_k, energy_output, ...}
            
        Returns:
            Number of points added
        """
        timeline_points = [
            ExperimentTimeline(
                id=str(uuid.uuid4()),
                experiment_id=experiment_id,
                timestamp_ms=point.get('timestamp_ms', 0),
                enhancement_factor=point.get('enhancement_factor'),
                temperature_k=point.get('temperature_k'),
                pressure_bar=point.get('pressure_bar'),
                energy_output=point.get('energy_output'),
                data_json=point.get('data', {}),
            )
            for point in points
        ]
        
        self.session.add_all(timeline_points)
        await self.session.commit()
        
        return len(timeline_points)
    
    async def get_experiment_timeline(
        self,
        experiment_id: str
    ) -> List[Dict[str, Any]]:
        """Get timeline data for a specific experiment."""
        query = (
            select(ExperimentTimeline)
            .where(ExperimentTimeline.experiment_id == experiment_id)
            .order_by(ExperimentTimeline.timestamp_ms)
        )
        
        result = await self.session.execute(query)
        points = result.scalars().all()
        
        return [p.to_dict() for p in points]
    
    # ==================
    # Export Methods
    # ==================
    
    async def export_experiments_csv(
        self,
        session_id: Optional[str] = None,
        include_baseline: bool = True,
    ) -> str:
        """
        Export experiments to CSV format.
        
        Returns:
            CSV string with headers and data
        """
        experiments, _ = await self.get_experiments(
            session_id=session_id,
            include_baseline=include_baseline,
            limit=10000,  # Large limit for export
        )
        
        if not experiments:
            return "No data to export"
        
        # Define CSV columns
        columns = [
            'id', 'name', 'type', 'status', 'material',
            'temperature_k', 'pressure_bar', 'loading_ratio',
            'enhancement_factor', 'energy_output_kev', 'duration_seconds',
            'source', 'is_baseline', 'created_at'
        ]
        
        # Build CSV
        lines = [','.join(columns)]
        
        for exp in experiments:
            row = [
                str(exp.get('id', '')),
                f'"{exp.get("name", "")}"',
                exp.get('type', ''),
                exp.get('status', ''),
                exp.get('material', ''),
                str(exp.get('temperature_k', '')),
                str(exp.get('pressure_bar', '')),
                str(exp.get('loading_ratio', '') or ''),
                str(exp.get('enhancement_factor', '') or ''),
                str(exp.get('energy_output_kev', '') or ''),
                str(exp.get('duration_seconds', '') or ''),
                f'"{exp.get("source", "")}"',
                str(exp.get('is_baseline', False)),
                exp.get('created_at', ''),
            ]
            lines.append(','.join(row))
        
        return '\n'.join(lines)
    
    async def export_experiments_json(
        self,
        session_id: Optional[str] = None,
        include_baseline: bool = True,
    ) -> List[Dict[str, Any]]:
        """Export experiments to JSON format."""
        experiments, _ = await self.get_experiments(
            session_id=session_id,
            include_baseline=include_baseline,
            limit=10000,
        )
        
        return experiments
    
    # ==================
    # Comparison Methods
    # ==================
    
    async def compare_experiments(
        self,
        experiment_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Get multiple experiments for side-by-side comparison.
        
        Args:
            experiment_ids: List of experiment IDs to compare
            
        Returns:
            List of experiment dictionaries
        """
        query = select(Experiment).where(Experiment.id.in_(experiment_ids))
        result = await self.session.execute(query)
        experiments = result.scalars().all()
        
        return [e.to_dict() for e in experiments]


# Factory function for dependency injection
def get_analytics_service(session: AsyncSession) -> AnalyticsService:
    """Create an AnalyticsService instance with the given session."""
    return AnalyticsService(session)
