"""First-class carbon / silicate / zirconium hosts must not fall back to Pd lattice."""

from app.physics_engine.unified_lenr_model.config import MaterialProperties


def test_graphite_and_sic_are_not_pd_generic() -> None:
    pd = MaterialProperties.palladium()
    graphite = MaterialProperties.from_name("graphite")
    sic = MaterialProperties.from_name("silicon_carbide")
    zr = MaterialProperties.from_name("zirconium")
    carbon_alias = MaterialProperties.from_name("carbon")

    assert graphite.atomic_number == 6
    assert graphite.lattice_constant != pd.lattice_constant
    assert carbon_alias.atomic_number == 6
    assert sic.atomic_number == 14
    assert sic.debye_temperature > pd.debye_temperature
    assert zr.atomic_number == 40
    copper = MaterialProperties.from_name("copper")
    assert copper.lattice_constant == pd.lattice_constant  # unknown still generic


def test_screening_aliases_do_not_fall_back_to_palladium() -> None:
    from app.physics_engine.unified_lenr_model.screening_data import (
        get_screening_potential,
    )

    assert get_screening_potential("carbon") == get_screening_potential("graphite")
    assert get_screening_potential("sic") == get_screening_potential("silicon_carbide")
    assert get_screening_potential("zr") == 120.0
    assert get_screening_potential("graphite") != get_screening_potential("palladium")


def test_bubble_lattice_hosts_are_not_pd_fallback() -> None:
    from app.physics_engine.bubble_lattice_interaction import LatticeParameters

    pd = LatticeParameters.for_material("palladium")
    graphite = LatticeParameters.for_material("graphite")
    sic = LatticeParameters.for_material("silicon_carbide")
    zr = LatticeParameters.for_material("zirconium")
    assert graphite.lattice_constant != pd.lattice_constant
    assert sic.debye_temperature > pd.debye_temperature
    assert zr.screening_potential == 120.0
