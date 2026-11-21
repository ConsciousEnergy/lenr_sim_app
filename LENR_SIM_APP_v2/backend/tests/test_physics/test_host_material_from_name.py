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


def test_constantan_host_is_first_class_not_ni_or_pd() -> None:
    """ENG-HS-06: Celani constantan must not fall back to Pd generic or Ni clone."""
    pd = MaterialProperties.palladium()
    ni = MaterialProperties.nickel()
    constantan = MaterialProperties.from_name("constantan")
    alias = MaterialProperties.from_name("constantan_Cu55Ni44Mn1")
    short = MaterialProperties.from_name("cu55ni44mn1")

    assert constantan.name == "Constantan"
    assert constantan.atomic_number == 29
    assert constantan.lattice_constant != pd.lattice_constant
    assert constantan.lattice_constant != ni.lattice_constant
    assert alias.lattice_constant == constantan.lattice_constant
    assert short.work_function == constantan.work_function


def test_screening_aliases_do_not_fall_back_to_palladium() -> None:
    from app.physics_engine.unified_lenr_model.screening_data import (
        get_screening_potential,
    )

    assert get_screening_potential("carbon") == get_screening_potential("graphite")
    assert get_screening_potential("sic") == get_screening_potential("silicon_carbide")
    assert get_screening_potential("zr") == 120.0
    assert get_screening_potential("graphite") != get_screening_potential("palladium")
    # Constantan uses Ni-class prior (ENG-HS-06); never Pd fallback.
    assert get_screening_potential("constantan") == get_screening_potential("nickel")


def test_bubble_lattice_hosts_are_not_pd_fallback() -> None:
    from app.physics_engine.bubble_lattice_interaction import LatticeParameters

    pd = LatticeParameters.for_material("palladium")
    graphite = LatticeParameters.for_material("graphite")
    sic = LatticeParameters.for_material("silicon_carbide")
    zr = LatticeParameters.for_material("zirconium")
    constantan = LatticeParameters.for_material("constantan")
    assert graphite.lattice_constant != pd.lattice_constant
    assert sic.debye_temperature > pd.debye_temperature
    assert zr.screening_potential == 120.0
    assert constantan.lattice_constant == 3.58e-10
    assert constantan.work_function == 4.85
