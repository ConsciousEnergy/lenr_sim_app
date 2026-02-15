"""
Theory Relationship Data Model for the LENR Relevance Map

Defines nodes (theories), edges (relationships), and the shared physical
properties taxonomy used by the D3 force-directed network graph on the
frontend and the scoring/validation engine on the backend.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class TheoryNode:
    """A single LENR theory for the network graph."""

    theory_id: str
    theory_name: str
    researcher: str
    year: int
    category: str  # "mechanism", "measurement", "engineering", "triggering"
    key_predictions: List[str] = field(default_factory=list)
    physical_properties: List[str] = field(default_factory=list)
    material_systems: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "theory_id": self.theory_id,
            "theory_name": self.theory_name,
            "researcher": self.researcher,
            "year": self.year,
            "category": self.category,
            "key_predictions": self.key_predictions,
            "physical_properties": self.physical_properties,
            "material_systems": self.material_systems,
        }


@dataclass
class TheoryEdge:
    """A relationship between two theories."""

    source_id: str
    target_id: str
    relationship_type: str  # shares_mechanism, predicts_same_product, explains_observation, contradicts, extends
    shared_properties: List[str] = field(default_factory=list)
    strength: float = 0.5  # 0-1
    description: str = ""

    def to_dict(self) -> Dict:
        return {
            "source": self.source_id,
            "target": self.target_id,
            "relationship_type": self.relationship_type,
            "shared_properties": self.shared_properties,
            "strength": self.strength,
            "description": self.description,
        }


# ---------------------------------------------------------------------------
# Physical properties taxonomy
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Default graph: all 19 theory nodes
# ---------------------------------------------------------------------------

def _build_default_nodes() -> List[TheoryNode]:
    """Return the full set of 19 theory nodes."""
    return [
        TheoryNode(
            theory_id="electron_screening",
            theory_name="Electron Screening",
            researcher="Raiola, Czerski",
            year=1987,
            category="mechanism",
            key_predictions=["Barrier reduction 10-100 eV", "Enhanced tunnelling"],
            physical_properties=["coulomb_barrier_reduction"],
            material_systems=["Pd-D", "Ni-H"],
        ),
        TheoryNode(
            theory_id="coherent_qed",
            theory_name="Coherent QED",
            researcher="Del Giudice, Preparata",
            year=1989,
            category="mechanism",
            key_predictions=["Coherent EM domains", "QED vacuum modification"],
            physical_properties=["coherent_quantum_states", "coulomb_barrier_reduction"],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="hydroton",
            theory_name="Hydroton (Storms)",
            researcher="Edmund Storms",
            year=2007,
            category="mechanism",
            key_predictions=["H-e-H chain fusion", "Resonance in nano-gaps", "He-4 product"],
            physical_properties=[
                "nano_confinement", "he4_production", "no_dangerous_radiation",
                "electron_mediation", "surface_reaction",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="nae_model",
            theory_name="NAE Model (Storms)",
            researcher="Edmund Storms",
            year=2007,
            category="mechanism",
            key_predictions=["Nuclear Active Environment in cracks", "Loading threshold"],
            physical_properties=[
                "surface_reaction", "nano_confinement", "loading_threshold",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="bubble_mhd_confinement",
            theory_name="Bubble-MHD Confinement",
            researcher="(Novel)",
            year=2024,
            category="mechanism",
            key_predictions=["MHD flux compression", "Hartmann flow confinement"],
            physical_properties=[
                "flux_compression", "nano_confinement", "coulomb_barrier_reduction",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="casimir_confinement",
            theory_name="Casimir Confinement",
            researcher="Casimir, Lifshitz",
            year=1948,
            category="mechanism",
            key_predictions=["Quantum vacuum confinement", "Nanoscale force enhancement"],
            physical_properties=["nano_confinement"],
            material_systems=["Pd-D", "Ni-H"],
        ),
        TheoryNode(
            theory_id="quantum_tunneling",
            theory_name="Quantum Tunneling (Gamow)",
            researcher="Gamow",
            year=1928,
            category="mechanism",
            key_predictions=["WKB tunnelling rate", "Gamow peak energy"],
            physical_properties=["coulomb_barrier_reduction"],
            material_systems=["Pd-D", "Ni-H"],
        ),
        # --- Phase 1A ---
        TheoryNode(
            theory_id="takahashi_tsc",
            theory_name="Takahashi TSC",
            researcher="Akito Takahashi",
            year=2004,
            category="mechanism",
            key_predictions=["4D→2He-4 + 47.6 MeV", "No neutrons", "No gamma"],
            physical_properties=[
                "multi_body_fusion", "he4_production", "no_dangerous_radiation",
                "coulomb_barrier_reduction", "loading_threshold",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="hagelstein_phonon",
            theory_name="Hagelstein Phonon-Nuclear",
            researcher="Peter Hagelstein",
            year=2010,
            category="mechanism",
            key_predictions=["24 MeV → 10^8 phonons", "No gamma", "He-4 product"],
            physical_properties=[
                "phonon_coupling", "he4_production", "no_dangerous_radiation",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="vysotskii_ccs",
            theory_name="Vysotskii CCS",
            researcher="Vladimir Vysotskii",
            year=2001,
            category="mechanism",
            key_predictions=["10^40 tunnelling enhancement", "Biological transmutation"],
            physical_properties=[
                "coherent_quantum_states", "coulomb_barrier_reduction",
                "transmutation", "weak_interaction",
            ],
            material_systems=["Pd-D", "biological"],
        ),
        TheoryNode(
            theory_id="swartz_nanor",
            theory_name="Swartz NANOR/LANR",
            researcher="Mitchell Swartz",
            year=2006,
            category="engineering",
            key_predictions=["Optimal Operating Point", "Reproducible excess heat"],
            physical_properties=[
                "loading_threshold", "surface_reaction", "nanoparticle_effects",
            ],
            material_systems=["Pd-D", "ZrO2-PdD"],
        ),
        TheoryNode(
            theory_id="miles_heat_helium",
            theory_name="Miles Heat-Helium",
            researcher="Melvin Miles",
            year=1993,
            category="measurement",
            key_predictions=["1W = 2.6e11 He-4/s", "23.8 MeV/fusion"],
            physical_properties=["he4_production", "no_dangerous_radiation"],
            material_systems=["Pd-D"],
        ),
        # --- Phase 1B ---
        TheoryNode(
            theory_id="widom_larsen",
            theory_name="Widom-Larsen ULM Neutrons",
            researcher="Widom, Larsen",
            year=2006,
            category="mechanism",
            key_predictions=["ULM neutron production", "Transmutation products"],
            physical_properties=[
                "weak_interaction", "electron_mediation", "transmutation",
                "surface_reaction", "no_dangerous_radiation",
            ],
            material_systems=["Pd-D", "Ni-H"],
        ),
        TheoryNode(
            theory_id="kim_bec",
            theory_name="Kim BEC Fusion",
            researcher="Yeong Kim",
            year=2009,
            category="mechanism",
            key_predictions=["N²-enhanced fusion rate", "BEC in nano-grains"],
            physical_properties=[
                "coherent_quantum_states", "coulomb_barrier_reduction",
                "he4_production", "nanoparticle_effects",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="matsumoto_enc",
            theory_name="Matsumoto ENC",
            researcher="Takaaki Matsumoto",
            year=1992,
            category="triggering",
            key_predictions=["Itonic clusters", "Micro ball lightning", "Nuclear fragments"],
            physical_properties=[
                "electromagnetic_triggering", "transmutation",
            ],
            material_systems=["Pd-D", "Ni-H"],
        ),
        # --- Phase 1C ---
        TheoryNode(
            theory_id="chubb_ion_band",
            theory_name="Chubb Ion Band State",
            researcher="Scott & Talbot Chubb",
            year=1990,
            category="mechanism",
            key_predictions=["Band-state D-D fusion", "Three miracles addressed", "He-4"],
            physical_properties=[
                "coulomb_barrier_reduction", "he4_production",
                "no_dangerous_radiation", "electron_mediation", "loading_threshold",
            ],
            material_systems=["Pd-D"],
        ),
        TheoryNode(
            theory_id="piantelli_ni_h",
            theory_name="Piantelli Ni-H",
            researcher="Francesco Piantelli",
            year=1994,
            category="engineering",
            key_predictions=["Thermal activation >400-700K", "Surface area scaling"],
            physical_properties=[
                "thermal_activation", "surface_reaction",
                "nanoparticle_effects", "material_specific_ni_h",
            ],
            material_systems=["Ni-H"],
        ),
        TheoryNode(
            theory_id="iwamura_transmutation",
            theory_name="Iwamura Transmutation",
            researcher="Yasuhiro Iwamura",
            year=2002,
            category="mechanism",
            key_predictions=["Cs→Pr (ΔZ=4)", "Ba→Sm (ΔZ=6)", "Multi-D absorption"],
            physical_properties=[
                "transmutation", "multi_body_fusion", "material_specific_pd_d",
            ],
            material_systems=["Pd-D", "Pd/CaO/Pd"],
        ),
        # --- Phase 2: Legacy Module Wrappers (v0.3.3-beta) ---
        TheoryNode(
            theory_id="phonon_coupling_legacy",
            theory_name="Phonon-Nuclear Coupling",
            researcher="Hagelstein, Preparata",
            year=2010,
            category="mechanism",
            key_predictions=["Coherent phonon enhancement", "Debye-Waller factor", "Polaron mass renormalisation"],
            physical_properties=[
                "phonon_coupling", "coherent_quantum_states",
            ],
            material_systems=["Pd-D", "Ni-H"],
        ),
        TheoryNode(
            theory_id="non_equilibrium_thermo",
            theory_name="Non-Equilibrium Thermodynamics",
            researcher="de Groot, Mazur, Fleischmann",
            year=1962,
            category="measurement",
            key_predictions=["COP > 1 detection", "Entropy production rate", "Energy balance analysis"],
            physical_properties=[
                "thermal_activation",
            ],
            material_systems=["Pd-D", "Ni-H"],
        ),
        TheoryNode(
            theory_id="letts_laser",
            theory_name="Letts-Cravens Laser",
            researcher="Dennis Letts, Dennis Cravens",
            year=2003,
            category="triggering",
            key_predictions=["680 nm resonance", "10-30× enhancement", "Au surface role"],
            physical_properties=[
                "electromagnetic_triggering", "surface_reaction",
                "he4_production", "material_specific_pd_d",
            ],
            material_systems=["Pd-D"],
        ),
    ]


def _build_default_edges() -> List[TheoryEdge]:
    """Return relationship edges between theories based on shared physics."""
    edges = []

    # --- He-4 producing theories ---
    he4_theories = [
        "hydroton", "takahashi_tsc", "hagelstein_phonon",
        "miles_heat_helium", "chubb_ion_band", "kim_bec", "letts_laser",
    ]
    for i, t1 in enumerate(he4_theories):
        for t2 in he4_theories[i + 1:]:
            edges.append(TheoryEdge(
                source_id=t1, target_id=t2,
                relationship_type="predicts_same_product",
                shared_properties=["he4_production", "no_dangerous_radiation"],
                strength=0.7,
                description="Both predict He-4 as primary product without radiation",
            ))

    # --- Coulomb barrier theories ---
    barrier_theories = [
        "electron_screening", "coherent_qed", "takahashi_tsc",
        "vysotskii_ccs", "kim_bec", "chubb_ion_band", "quantum_tunneling",
        "bubble_mhd_confinement",
    ]
    for i, t1 in enumerate(barrier_theories):
        for t2 in barrier_theories[i + 1:]:
            edges.append(TheoryEdge(
                source_id=t1, target_id=t2,
                relationship_type="shares_mechanism",
                shared_properties=["coulomb_barrier_reduction"],
                strength=0.5,
                description="Both address Coulomb barrier penetration",
            ))

    # --- Phonon/lattice coupling ---
    edges.append(TheoryEdge(
        source_id="hagelstein_phonon", target_id="hydroton",
        relationship_type="extends",
        shared_properties=["phonon_coupling", "no_dangerous_radiation"],
        strength=0.8,
        description="Hagelstein provides mechanism for Storms' slow resonance",
    ))

    # --- NAE and surface theories ---
    edges.append(TheoryEdge(
        source_id="nae_model", target_id="hydroton",
        relationship_type="extends",
        shared_properties=["nano_confinement", "surface_reaction"],
        strength=0.95,
        description="NAE provides the site; Hydroton the mechanism within",
    ))
    edges.append(TheoryEdge(
        source_id="nae_model", target_id="swartz_nanor",
        relationship_type="shares_mechanism",
        shared_properties=["loading_threshold", "surface_reaction"],
        strength=0.6,
        description="Both require specific loading conditions for activation",
    ))

    # --- Electron mediation ---
    edges.append(TheoryEdge(
        source_id="hydroton", target_id="widom_larsen",
        relationship_type="shares_mechanism",
        shared_properties=["electron_mediation"],
        strength=0.4,
        description="Both invoke special electron roles, but different mechanisms",
    ))
    edges.append(TheoryEdge(
        source_id="widom_larsen", target_id="chubb_ion_band",
        relationship_type="shares_mechanism",
        shared_properties=["electron_mediation"],
        strength=0.3,
        description="Both involve electron participation in nuclear reactions",
    ))

    # --- Transmutation theories ---
    edges.append(TheoryEdge(
        source_id="iwamura_transmutation", target_id="widom_larsen",
        relationship_type="explains_observation",
        shared_properties=["transmutation"],
        strength=0.7,
        description="W-L neutron capture could explain Iwamura transmutations",
    ))
    edges.append(TheoryEdge(
        source_id="iwamura_transmutation", target_id="vysotskii_ccs",
        relationship_type="shares_mechanism",
        shared_properties=["transmutation", "multi_body_fusion"],
        strength=0.5,
        description="Both predict transmutation via multi-body processes",
    ))
    edges.append(TheoryEdge(
        source_id="matsumoto_enc", target_id="widom_larsen",
        relationship_type="shares_mechanism",
        shared_properties=["transmutation", "electromagnetic_triggering"],
        strength=0.3,
        description="Both predict transmutation products from EM-driven processes",
    ))

    # --- Coherent quantum state theories ---
    edges.append(TheoryEdge(
        source_id="coherent_qed", target_id="vysotskii_ccs",
        relationship_type="shares_mechanism",
        shared_properties=["coherent_quantum_states"],
        strength=0.6,
        description="Both rely on coherent many-body quantum states",
    ))
    edges.append(TheoryEdge(
        source_id="coherent_qed", target_id="kim_bec",
        relationship_type="shares_mechanism",
        shared_properties=["coherent_quantum_states"],
        strength=0.5,
        description="Both invoke macroscopic quantum coherence",
    ))

    # --- Multi-body fusion ---
    edges.append(TheoryEdge(
        source_id="takahashi_tsc", target_id="iwamura_transmutation",
        relationship_type="shares_mechanism",
        shared_properties=["multi_body_fusion"],
        strength=0.6,
        description="Both propose multi-deuteron simultaneous reactions",
    ))

    # --- Ni-H specific ---
    edges.append(TheoryEdge(
        source_id="piantelli_ni_h", target_id="widom_larsen",
        relationship_type="explains_observation",
        shared_properties=["material_specific_ni_h", "surface_reaction"],
        strength=0.5,
        description="W-L could explain Piantelli's Ni-H excess heat",
    ))

    # --- Nano-confinement ---
    edges.append(TheoryEdge(
        source_id="casimir_confinement", target_id="bubble_mhd_confinement",
        relationship_type="extends",
        shared_properties=["nano_confinement"],
        strength=0.7,
        description="Both provide nanoscale confinement mechanisms",
    ))
    edges.append(TheoryEdge(
        source_id="casimir_confinement", target_id="nae_model",
        relationship_type="explains_observation",
        shared_properties=["nano_confinement"],
        strength=0.6,
        description="Casimir forces may help define NAE crack geometry",
    ))

    # --- Triggering theories ---
    edges.append(TheoryEdge(
        source_id="letts_laser", target_id="matsumoto_enc",
        relationship_type="shares_mechanism",
        shared_properties=["electromagnetic_triggering"],
        strength=0.4,
        description="Both use EM energy to trigger nuclear reactions",
    ))
    edges.append(TheoryEdge(
        source_id="letts_laser", target_id="hagelstein_phonon",
        relationship_type="extends",
        shared_properties=["phonon_coupling", "electromagnetic_triggering"],
        strength=0.7,
        description="Laser may excite optical phonons coupled to nuclear states",
    ))

    # --- Validation edges ---
    edges.append(TheoryEdge(
        source_id="miles_heat_helium", target_id="takahashi_tsc",
        relationship_type="explains_observation",
        shared_properties=["he4_production"],
        strength=0.8,
        description="TSC predicts He-4 consistent with Miles correlation",
    ))
    edges.append(TheoryEdge(
        source_id="miles_heat_helium", target_id="hagelstein_phonon",
        relationship_type="explains_observation",
        shared_properties=["he4_production"],
        strength=0.8,
        description="Phonon model explains heat-helium energy balance",
    ))
    edges.append(TheoryEdge(
        source_id="miles_heat_helium", target_id="hydroton",
        relationship_type="explains_observation",
        shared_properties=["he4_production"],
        strength=0.85,
        description="Hydroton predicts He-4 at rates matching Miles",
    ))

    # --- Phonon coupling connections ---
    edges.append(TheoryEdge(
        source_id="phonon_coupling_legacy", target_id="hagelstein_phonon",
        relationship_type="extends",
        shared_properties=["phonon_coupling"],
        strength=0.85,
        description="Legacy phonon module provides quantitative Debye-Waller and polaron effects",
    ))
    edges.append(TheoryEdge(
        source_id="phonon_coupling_legacy", target_id="hydroton",
        relationship_type="extends",
        shared_properties=["phonon_coupling"],
        strength=0.5,
        description="Phonon coupling facilitates energy dissipation in Hydroton resonance",
    ))

    # --- Non-equilibrium thermo connections ---
    edges.append(TheoryEdge(
        source_id="non_equilibrium_thermo", target_id="miles_heat_helium",
        relationship_type="explains_observation",
        shared_properties=["thermal_activation"],
        strength=0.7,
        description="Non-eq thermo validates heat-helium energy balance",
    ))
    edges.append(TheoryEdge(
        source_id="non_equilibrium_thermo", target_id="swartz_nanor",
        relationship_type="explains_observation",
        shared_properties=["thermal_activation"],
        strength=0.6,
        description="COP analysis validates Swartz NANOR excess heat claims",
    ))

    # --- Swartz OOP and loading threshold ---
    edges.append(TheoryEdge(
        source_id="swartz_nanor", target_id="chubb_ion_band",
        relationship_type="explains_observation",
        shared_properties=["loading_threshold"],
        strength=0.5,
        description="Ion band states may explain Swartz OOP loading requirement",
    ))
    edges.append(TheoryEdge(
        source_id="swartz_nanor", target_id="piantelli_ni_h",
        relationship_type="shares_mechanism",
        shared_properties=["nanoparticle_effects", "surface_reaction"],
        strength=0.4,
        description="Both use nanostructured materials for enhanced performance",
    ))

    return edges


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

class TheoryGraph:
    """Full theory relationship graph for the Relevance Map."""

    def __init__(
        self,
        nodes: Optional[List[TheoryNode]] = None,
        edges: Optional[List[TheoryEdge]] = None,
    ):
        self.nodes = nodes or _build_default_nodes()
        self.edges = edges or _build_default_edges()
        self._node_map = {n.theory_id: n for n in self.nodes}

    def get_node(self, theory_id: str) -> Optional[TheoryNode]:
        return self._node_map.get(theory_id)

    def get_edges_for(self, theory_id: str) -> List[TheoryEdge]:
        return [
            e for e in self.edges
            if e.source_id == theory_id or e.target_id == theory_id
        ]

    def get_shared_properties(self, t1: str, t2: str) -> List[str]:
        n1 = self._node_map.get(t1)
        n2 = self._node_map.get(t2)
        if not n1 or not n2:
            return []
        return list(set(n1.physical_properties) & set(n2.physical_properties))

    def filter_by_property(self, prop: str) -> List[TheoryNode]:
        return [n for n in self.nodes if prop in n.physical_properties]

    def filter_by_category(self, category: str) -> List[TheoryNode]:
        return [n for n in self.nodes if n.category == category]

    def filter_by_material(self, material: str) -> List[TheoryNode]:
        return [n for n in self.nodes if material in n.material_systems]

    # -- Coupling pipeline helpers (v0.3.3-beta) ----------------------------

    # Directed "extends" and "explains_observation" edges define a partial
    # order: source -> target means source should run BEFORE target so its
    # outputs can feed into the target's conditions.
    _DIRECTED_TYPES = {"extends", "explains_observation"}

    def _build_dependency_dag(
        self, enabled: Optional[List[str]] = None,
    ) -> Dict[str, List[str]]:
        """Return an adjacency list: {theory_id -> [theories that depend on it]}.

        Only considers directed relationship types (``extends``,
        ``explains_observation``).  If *enabled* is given, only those
        theory IDs are included.
        """
        all_ids = {n.theory_id for n in self.nodes}
        if enabled:
            all_ids = all_ids & set(enabled)

        adj: Dict[str, List[str]] = {tid: [] for tid in all_ids}
        for e in self.edges:
            if e.relationship_type not in self._DIRECTED_TYPES:
                continue
            src, tgt = e.source_id, e.target_id
            if src in all_ids and tgt in all_ids:
                adj.setdefault(src, []).append(tgt)
        return adj

    def topological_sort(
        self, enabled: Optional[List[str]] = None,
    ) -> List[str]:
        """Return theory IDs in dependency order (upstream first).

        Uses Kahn's algorithm.  Theories without directed edges are
        appended at the end in their original registration order.
        """
        adj = self._build_dependency_dag(enabled)
        all_ids = set(adj.keys())

        # In-degree map
        in_deg: Dict[str, int] = {tid: 0 for tid in all_ids}
        for src, targets in adj.items():
            for tgt in targets:
                in_deg[tgt] = in_deg.get(tgt, 0) + 1

        # Seed queue with zero-in-degree nodes (stable order)
        queue = sorted([tid for tid, d in in_deg.items() if d == 0])
        result: List[str] = []

        while queue:
            tid = queue.pop(0)
            result.append(tid)
            for downstream in sorted(adj.get(tid, [])):
                in_deg[downstream] -= 1
                if in_deg[downstream] == 0:
                    queue.append(downstream)

        # Append any remaining (cycle members) to avoid dropping them
        remaining = all_ids - set(result)
        result.extend(sorted(remaining))
        return result

    def get_coupling_map(
        self, enabled: Optional[List[str]] = None,
    ) -> Dict[str, List[Dict]]:
        """Return a map of {target_id: [{source_id, relationship_type, shared_properties}]}.

        Only includes directed relationships (extends / explains_observation).
        """
        all_ids = {n.theory_id for n in self.nodes}
        if enabled:
            all_ids = all_ids & set(enabled)

        coupling: Dict[str, List[Dict]] = {}
        for e in self.edges:
            if e.relationship_type not in self._DIRECTED_TYPES:
                continue
            if e.source_id in all_ids and e.target_id in all_ids:
                coupling.setdefault(e.target_id, []).append({
                    "source_id": e.source_id,
                    "relationship_type": e.relationship_type,
                    "shared_properties": e.shared_properties,
                    "strength": e.strength,
                })
        return coupling

    def to_dict(self) -> Dict:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "properties_taxonomy": PHYSICAL_PROPERTIES_TAXONOMY,
        }
