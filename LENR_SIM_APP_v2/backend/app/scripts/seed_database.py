"""
Database Seeding Script for LENR Simulation App

Seeds the database with baseline LENR experiment data from published research.
Idempotent - safe to run multiple times.

v0.3.6-beta

Usage:
    cd backend
    python -m app.scripts.seed_database
    
    # Or with options:
    python -m app.scripts.seed_database --force  # Re-seed even if data exists
"""

import asyncio
import argparse
import logging
import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import db_manager, get_database_url, Base
from app.models.database_models import Experiment, ExperimentTimeline
from app.data.baseline_experiments import get_baseline_experiments, get_baseline_timeline_data
from app.data.dataset_io import iccf27_literature_records, stable_baseline_id
from app.services.literature_moe_persistence import (
    literature_moe_columns_from_record,
    merge_bayesian_into_results,
)

# Cite-gated ICCF-27 Kasagi pair — corpus MoE only; not part of the locked 19 baselines.
CITE_GATED_KASAGI_IDS = (
    "kasagi-nicu-radiant-2026",
    "kasagi-ni-radiant-2026",
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def check_baseline_exists(session: AsyncSession) -> int:
    """Check how many baseline experiments exist in the database."""
    query = select(func.count(Experiment.id)).where(Experiment.is_baseline == True)
    result = await session.execute(query)
    return result.scalar() or 0


async def seed_baseline_experiments(session: AsyncSession, force: bool = False) -> int:
    """
    Seed the database with baseline LENR experiments.
    
    Args:
        session: Database session
        force: If True, re-seed even if data exists
        
    Returns:
        Number of experiments seeded
    """
    # Check if baseline data already exists
    existing_count = await check_baseline_exists(session)
    
    if existing_count > 0 and not force:
        logger.info(f"Found {existing_count} existing baseline experiments. Use --force to re-seed.")
        return 0
    
    if existing_count > 0 and force:
        logger.info(f"Force mode: Deleting {existing_count} existing baseline experiments...")
        # Delete existing baseline experiments
        query = select(Experiment).where(Experiment.is_baseline == True)
        result = await session.execute(query)
        experiments = result.scalars().all()
        
        for exp in experiments:
            await session.delete(exp)
        
        await session.commit()
        logger.info("Existing baseline experiments deleted.")
    
    # Get baseline experiment data
    baseline_data = get_baseline_experiments()
    logger.info(f"Seeding {len(baseline_data)} baseline experiments...")
    
    # Create experiment objects
    experiments_created = 0
    
    for exp_data in baseline_data:
        moe_columns = literature_moe_columns_from_record(exp_data)
        results_json = merge_bayesian_into_results(
            exp_data.get('results', {}),
            moe_columns,
        )
        experiment = Experiment(
            id=exp_data.get('id'),
            name=exp_data.get('name'),
            description=exp_data.get('description'),
            experiment_type=exp_data.get('experiment_type', 'lenr'),
            status=exp_data.get('status', 'completed'),
            is_baseline=True,
            source=exp_data.get('source'),
            source_url=exp_data.get('source_url'),
            material=exp_data.get('material', 'palladium'),
            temperature_k=exp_data.get('temperature_k', 300.0),
            pressure_bar=exp_data.get('pressure_bar', 1.0),
            loading_ratio=exp_data.get('loading_ratio'),
            defect_density=exp_data.get('defect_density'),
            driving_frequency_khz=exp_data.get('driving_frequency_khz'),
            parameters_json=exp_data.get('parameters', {}),
            enhancement_factor=exp_data.get('enhancement_factor'),
            fusion_rate=exp_data.get('fusion_rate'),
            energy_output_kev=exp_data.get('energy_output_kev'),
            excess_heat_watts=exp_data.get('excess_heat_watts'),
            duration_seconds=exp_data.get('duration_seconds'),
            results_json=results_json,
            literature_id=moe_columns.get('literature_id'),
            claim_tag=moe_columns.get('claim_tag'),
            citation_key=moe_columns.get('citation_key'),
            doi=moe_columns.get('doi'),
            open_question_ids=moe_columns.get('open_question_ids'),
            sigma_q_w=moe_columns.get('sigma_q_w'),
            sigma_q_statistical_w=moe_columns.get('sigma_q_statistical_w'),
            sigma_q_systematic_w=moe_columns.get('sigma_q_systematic_w'),
            sigma_q_instrument_floor_w=moe_columns.get(
                'sigma_q_instrument_floor_w'
            ),
            sigma_q_relative_fraction=moe_columns.get(
                'sigma_q_relative_fraction'
            ),
            moe_provenance=moe_columns.get('moe_provenance'),
            moe_citation_keys=moe_columns.get('moe_citation_keys'),
            moe_notes=moe_columns.get('moe_notes'),
            moe_sigma_q_pairing_verified=moe_columns.get(
                'moe_sigma_q_pairing_verified'
            ),
            s_heat=moe_columns.get('s_heat'),
            discovery_grade_eligible=bool(
                moe_columns.get('discovery_grade_eligible')
            ),
            bayesian_summary=moe_columns.get('bayesian_summary'),
        )
        
        # Set created_at if provided
        if 'created_at' in exp_data:
            experiment.created_at = exp_data['created_at']
        
        session.add(experiment)
        experiments_created += 1
        
        logger.debug(f"  Added: {experiment.name}")
    
    await session.commit()
    logger.info(f"Successfully seeded {experiments_created} baseline experiments.")
    
    return experiments_created


async def seed_timeline_data(session: AsyncSession) -> int:
    """
    Seed sample timeline data for demonstration.
    
    Returns:
        Number of timeline points seeded
    """
    # Get sample timeline data
    timeline_data = get_baseline_timeline_data()
    
    # For demonstration, we'll add timeline data to the first baseline experiment
    query = select(Experiment).where(Experiment.is_baseline == True).limit(1)
    result = await session.execute(query)
    experiment = result.scalar_one_or_none()
    
    if not experiment:
        logger.warning("No baseline experiments found. Run seed_baseline_experiments first.")
        return 0
    
    # Check if timeline data already exists
    timeline_query = select(func.count(ExperimentTimeline.id)).where(
        ExperimentTimeline.experiment_id == experiment.id
    )
    result = await session.execute(timeline_query)
    existing_count = result.scalar() or 0
    
    if existing_count > 0:
        logger.info(f"Timeline data already exists for experiment {experiment.name}. Skipping.")
        return 0
    
    # Add timeline points
    sample_timeline = timeline_data.get("fleischmann_pons_sample", [])
    points_created = 0
    
    for point in sample_timeline:
        timeline_point = ExperimentTimeline(
            experiment_id=experiment.id,
            timestamp_ms=point.get('timestamp_ms', 0),
            enhancement_factor=point.get('enhancement_factor'),
            temperature_k=point.get('temperature_k'),
            energy_output=point.get('energy_output'),
            data_json=point.get('data', {}),
        )
        session.add(timeline_point)
        points_created += 1
    
    await session.commit()
    logger.info(f"Seeded {points_created} timeline points for experiment: {experiment.name}")
    
    return points_created


async def hydrate_demo_pack(session: AsyncSession) -> dict:
    """Import the committed q_campaign_demo pack (model outputs, not LENR proof)."""
    from app.data.dataset_io import datasets_root
    from app.services.reviewer_pack import import_pack_rows

    pack_dir = datasets_root() / "reviewer_packs" / "q_campaign_demo"
    logger.info("Hydrating demo pack from %s", pack_dir)
    return await import_pack_rows(session, pack_dir)


async def seed_cite_gated_kasagi_moe(
    session: AsyncSession,
    force: bool = False,
) -> int:
    """Seed cite-gated Kasagi pair into Experiment SQL with real corpus MoE.

    Uses ``literature_moe_columns_from_record`` only — never invents σ_Q.
    Rows are **not** locked baselines (``is_baseline=False``). Analytics
    ``discovery_grade_eligible`` may be true; ``lenr_proved`` stays false.
    """
    by_id = {
        str(row["literature_id"]): row
        for row in iccf27_literature_records()
        if row.get("literature_id")
    }
    created = 0
    for lit_id in CITE_GATED_KASAGI_IDS:
        record = by_id.get(lit_id)
        if record is None:
            raise RuntimeError(f"cite-gated Kasagi missing from ICCF-27 corpus: {lit_id}")
        exp_id = stable_baseline_id(lit_id)
        existing = (
            await session.execute(select(Experiment).where(Experiment.id == exp_id))
        ).scalar_one_or_none()
        if existing is not None and not force:
            logger.info("Kasagi MoE row already present for %s — skip", lit_id)
            continue
        if existing is not None and force:
            await session.delete(existing)
            await session.flush()

        moe_columns = literature_moe_columns_from_record(record)
        if moe_columns.get("moe_provenance") != "literature_reported":
            raise RuntimeError(f"{lit_id} MoE provenance is not literature_reported")
        if moe_columns.get("sigma_q_w") != 0.08:
            raise RuntimeError(f"{lit_id} unexpected sigma_q_w={moe_columns.get('sigma_q_w')}")
        results_json = merge_bayesian_into_results(
            record.get("results") or {},
            moe_columns,
        )
        results_json["lenr_proved"] = False
        results_json["is_model_output"] = False
        results_json["seed_source"] = "literature_iccf27.v1_cite_gated"

        experiment = Experiment(
            id=exp_id,
            name=record.get("name") or lit_id,
            description=record.get("description"),
            experiment_type=record.get("experiment_type", "lenr"),
            status=record.get("status", "completed"),
            is_baseline=False,
            source=record.get("source"),
            source_url=record.get("source_url"),
            material=record.get("material", "nickel"),
            temperature_k=record.get("temperature_k", 1100.0),
            pressure_bar=record.get("pressure_bar", 0.003),
            loading_ratio=record.get("loading_ratio"),
            parameters_json=record.get("parameters") or {},
            enhancement_factor=record.get("enhancement_factor"),
            energy_output_kev=record.get("energy_output_kev"),
            excess_heat_watts=record.get("excess_heat_watts"),
            duration_seconds=record.get("duration_seconds"),
            results_json=results_json,
            literature_id=moe_columns.get("literature_id"),
            claim_tag=moe_columns.get("claim_tag"),
            citation_key=moe_columns.get("citation_key"),
            doi=moe_columns.get("doi"),
            open_question_ids=moe_columns.get("open_question_ids"),
            sigma_q_w=moe_columns.get("sigma_q_w"),
            sigma_q_statistical_w=moe_columns.get("sigma_q_statistical_w"),
            sigma_q_systematic_w=moe_columns.get("sigma_q_systematic_w"),
            sigma_q_instrument_floor_w=moe_columns.get("sigma_q_instrument_floor_w"),
            sigma_q_relative_fraction=moe_columns.get("sigma_q_relative_fraction"),
            moe_provenance=moe_columns.get("moe_provenance"),
            moe_citation_keys=moe_columns.get("moe_citation_keys"),
            moe_notes=moe_columns.get("moe_notes"),
            moe_sigma_q_pairing_verified=moe_columns.get(
                "moe_sigma_q_pairing_verified"
            ),
            s_heat=moe_columns.get("s_heat"),
            discovery_grade_eligible=bool(
                moe_columns.get("discovery_grade_eligible")
            ),
            bayesian_summary=moe_columns.get("bayesian_summary"),
        )
        session.add(experiment)
        created += 1
        logger.info(
            "Seeded cite-gated Kasagi MoE %s (S_heat=%s, discovery=%s)",
            lit_id,
            moe_columns.get("s_heat"),
            moe_columns.get("discovery_grade_eligible"),
        )

    if created:
        await session.commit()
    return created


async def main(
    force: bool = False,
    skip_timeline: bool = False,
    hydrate_demo: bool = False,
    seed_kasagi_moe: bool = True,
):
    """
    Main seeding function.
    
    Args:
        force: If True, re-seed even if data exists
        skip_timeline: If True, skip timeline data seeding
        hydrate_demo: If True, import q_campaign_demo after baselines
        seed_kasagi_moe: If True (default), seed cite-gated Kasagi MoE rows
    """
    logger.info("Starting database seeding...")
    
    # Initialize database
    database_url = get_database_url()
    logger.info(f"Database URL: {database_url[:50]}...")
    
    db_manager.initialize(database_url=database_url, echo=False)
    
    # Create tables if they don't exist
    await db_manager.create_tables()
    logger.info("Database tables created/verified.")
    
    # Seed data
    async with db_manager.session() as session:
        # Seed baseline experiments
        experiments_seeded = await seed_baseline_experiments(session, force=force)
        
        # Seed timeline data
        if not skip_timeline:
            timeline_points = await seed_timeline_data(session)
        else:
            timeline_points = 0

        kasagi_seeded = 0
        if seed_kasagi_moe:
            kasagi_seeded = await seed_cite_gated_kasagi_moe(session, force=force)

        pack_summary = None
        if hydrate_demo:
            pack_summary = await hydrate_demo_pack(session)
    
    # Close database
    await db_manager.close()
    
    logger.info("=" * 50)
    logger.info("Seeding Summary:")
    logger.info(f"  Baseline experiments seeded: {experiments_seeded}")
    logger.info(f"  Timeline points seeded: {timeline_points}")
    logger.info(f"  Cite-gated Kasagi MoE seeded: {kasagi_seeded}")
    if pack_summary:
        logger.info(
            "  Demo pack experiments: %s inserted / %s updated",
            pack_summary.get("experiments_inserted"),
            pack_summary.get("experiments_updated"),
        )
        logger.info(
            "  Demo pack theory_runs: %s inserted / %s updated",
            pack_summary.get("theory_runs_inserted"),
            pack_summary.get("theory_runs_updated"),
        )
    logger.info("=" * 50)
    logger.info("Database seeding complete!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed the LENR Simulation database with baseline experiment data."
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Force re-seeding even if data already exists"
    )
    parser.add_argument(
        "--skip-timeline",
        action="store_true",
        help="Skip seeding timeline data"
    )
    parser.add_argument(
        "--hydrate-demo",
        action="store_true",
        help="Import datasets/reviewer_packs/q_campaign_demo after seeding (model outputs, 150 experiments / 132 theory_runs)",
    )
    parser.add_argument(
        "--skip-kasagi-moe",
        action="store_true",
        help="Skip cite-gated Kasagi MoE seed (default: seed both Kasagi rows from literature_iccf27)",
    )
    
    args = parser.parse_args()
    
    asyncio.run(main(
        force=args.force,
        skip_timeline=args.skip_timeline,
        hydrate_demo=args.hydrate_demo,
        seed_kasagi_moe=not args.skip_kasagi_moe,
    ))
