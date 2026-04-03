"""
TheoryNode, TheoryEdge, PHYSICAL_PROPERTIES_TAXONOMY for LENR Relevance Map.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class TheoryNode:
    theory_id: str
    theory_name: str
    researcher: str
    year: int
    category: str
    key_predictions: List[str] = field(default_factory=list)
    physical_properties: List[str] = field(default_factory=list)
    material_systems: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {"theory_id": self.theory_id, "theory_name": self.theory_name,
            "researcher": self.researcher, "year": self.year, "category": self.category,
            "key_predictions": self.key_predictions, "physical_properties": self.physical_properties,
            "material_systems": self.material_systems}

@dataclass
class TheoryEdge:
    source_id: str
    target_id: str
    relationship_type: str
    shared_properties: List[str] = field(default_factory=list)
    strength: float = 0.5
    description: str = ""

    def to_dict(self) -> Dict:
        return {"source": self.source_id, "target": self.target_id,
            "relationship_type": self.relationship_type, "shared_properties": self.shared_properties,
            "strength": self.strength, "description": self.description}

PHYSICAL_PROPERTIES_TAXONOMY: Dict[str, str] = {
    "coulomb_barrier_reduction": "Mechanisms that reduce or bypass the Coulomb barrier",
    "he4_production": "Predicts He-4 as a primary product",
    "no_dangerous_radiation": "No significant neutron or gamma radiation",
    "surface_reaction": "Reactions localised at material surfaces",
    "nano_confinement": "Nanoscale confinement enhances reactions",
    "phonon_coupling": "Energy transfer via lattice phonons",
    "loading_threshold": "Requires minimum D/H loading ratio",
    "electron_mediation": "Electrons play a mediating role",
    "multi_body_fusion": "More than two-body fusion process",
    "thermal_activation": "Temperature threshold for onset",
    "coherent_quantum_states": "Coherent many-body quantum phenomena",
    "flux_compression": "Magnetic/mechanical flux compression",
    "weak_interaction": "Weak nuclear force involvement",
    "transmutation": "Predicts elemental transmutations",
    "electromagnetic_triggering": "EM fields trigger or enhance reactions",
    "nanoparticle_effects": "Nanoparticle/nanostructure involvement",
    "material_specific_pd_d": "Specific to Pd-D systems",
    "material_specific_ni_h": "Specific to Ni-H systems",
}