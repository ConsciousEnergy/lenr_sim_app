"""Tests for mechanism path diagram specifications."""

from app.physics_engine.mechanism_path_diagrams import (
    enrich_mechanism_paths,
    get_mechanism_diagram_spec,
)


def test_trapped_state_diagram_has_nodes_and_edges():
    spec = get_mechanism_diagram_spec("trapped_state")
    assert spec["nodes"]
    assert spec["edges"]
    assert "EQ-NBODY-FGR-01" in spec["lean_ids"]


def test_enrich_mechanism_paths_attaches_diagram_spec():
    paths = [{"id": "phonon_cascade", "posterior": 0.1}]
    enriched = enrich_mechanism_paths(paths)
    assert enriched[0]["diagram_spec"]["title"]
    assert enriched[0]["diagram_spec"]["nodes"]
