"""Default theory nodes and edges for LENR Relevance Map."""
from typing import List
from .nodes import TheoryNode, TheoryEdge

def _build_default_nodes() -> List[TheoryNode]:
    """Return the full set of registered theory nodes."""
    return [
        TheoryNode(
            theory_id="electron_screening",
            theory_name="Electron Screening",
            researcher="Raiola, Czerski",
            year=1987,
            category="mechanism",
            key_predictions=["Material-dependent barrier reduction (tens to hundreds of eV)", "Enhanced tunnelling"],
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
            key_predictions=["4D→2He-4 + 47.6 MeV", "No neutrons", "No gamma",
                             "4H/TSC WS literature context (protium, not implemented)"],
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
        TheoryNode(
            theory_id="stellar_scaling_mhd",
            theory_name="Stellar-Scaling MHD (context)",
            researcher="Parkin, Pudritz",
            year=2004,
            category="engineering",
            key_predictions=[
                "Cross-regime MHD dimensionless groups",
                "Not an LENR mechanism prediction",
            ],
            physical_properties=["flux_compression"],
            material_systems=["context"],
        ),
        TheoryNode(
            theory_id="czerski_thermal_spike",
            theory_name="Czerski Thermal Spike",
            researcher="Konrad Czerski",
            year=2024,
            category="mechanism",
            key_predictions=[
                "Thermal DD fusion in ion tracks",
                "Yield plateau below ~2.5 keV",
            ],
            physical_properties=[
                "coulomb_barrier_reduction",
                "he4_production",
                "phonon_coupling",
            ],
            material_systems=["Zr-D", "Ti-D", "Pd-D"],
        ),
    ]


def _build_default_edges() -> List[TheoryEdge]:
    """Return relationship edges between theories based on shared physics."""
    edges = []

    # --- He-4 producing theories ---
    he4_theories = [
        "takahashi_tsc", "hagelstein_phonon",
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
        "bubble_mhd_confinement", "czerski_thermal_spike",
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
    # --- NAE and surface theories ---
    edges.append(TheoryEdge(
        source_id="nae_model", target_id="swartz_nanor",
        relationship_type="shares_mechanism",
        shared_properties=["loading_threshold", "surface_reaction"],
        strength=0.6,
        description="Both require specific loading conditions for activation",
    ))

    # --- Electron mediation ---
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
        source_id="stellar_scaling_mhd", target_id="bubble_mhd_confinement",
        relationship_type="extends",
        shared_properties=["flux_compression"],
        strength=0.3,
        description="Stellar MHD scaling is a cross-regime context line, not an LENR mechanism",
    ))
    edges.append(TheoryEdge(
        source_id="czerski_thermal_spike", target_id="electron_screening",
        relationship_type="complements",
        shared_properties=["coulomb_barrier_reduction"],
        strength=0.6,
        description="Thermal-spike local T multiplies a screened DD cross-section; groups stay distinct so they do not compound",
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

    # --- Phonon coupling connections ---
    edges.append(TheoryEdge(
        source_id="phonon_coupling_legacy", target_id="hagelstein_phonon",
        relationship_type="extends",
        shared_properties=["phonon_coupling"],
        strength=0.85,
        description="Legacy phonon module provides quantitative Debye-Waller and polaron effects",
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