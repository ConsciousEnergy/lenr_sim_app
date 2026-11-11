import LenrFormal.OpenObligations

/-!
WeakInteraction — EQ-EC-THRESH-01 / EQ-EC-GF-01 / EQ-EC-SIGMA-01 / EQ-EC-RATE-01
/ EQ-OPEN-EC-BOUND-01

Integer-scaled Fermi \(G_F\), weak \(\sigma\) magnitude envelope, and thermal
Boltzmann EC-rate bounds matching
`LENR_SIM_APP_v2/backend/app/physics/weak_interaction.py`, plus the
condensed-matter energy-budget deficit family for Q4.

**Claim tier:** mathematical bookkeeping only.
These identities do **not** discharge `EQ-OPEN-EC-01`, do **not** prove a
condensed-matter path to \(E_e > 0.782\,\mathrm{MeV}\), and do **not** prove
that LENR occurs. `lenrProved` stays false. There is no `theorem lenr_occurs`.
-/

namespace LenrFormal.WeakInteraction

open LenrFormal.OpenObligations

/-- EQ-EC-GF-01: PDG \(G_F \approx 1.166\times 10^{-5}\,\mathrm{GeV}^{-2}\)
    stored as \(G_F \times 10^{8}\). Matches Python `G_F_GEV_INV2`. -/
def gF_x1e8 : Nat := 1166

theorem gF_anchor : gF_x1e8 = 1166 := rfl

/-- Squared Fermi constant in \(\times 10^{16}\,\mathrm{GeV}^{-4}\) units. -/
def gF2_x1e16 : Nat := 1359556

theorem gF2_is_square : gF2_x1e16 = gF_x1e8 * gF_x1e8 := by
  native_decide

/-- EQ-EC-THRESH-01: \(p+e^-\to n+\nu_e\) threshold \(0.782\,\mathrm{MeV}\) in eV.
    Matches Python `THRESHOLD_ELECTRON_MEV`. -/
def threshold_eV : Nat := 782000

def threshold_keV : Nat := 782

theorem threshold_is_782000_eV : threshold_eV = 782000 := rfl

theorem threshold_eV_from_keV : threshold_eV = threshold_keV * 1000 := by
  native_decide

/-- Reference neutrino / equivalent energy \(1\,\mathrm{MeV}\) in eV
    (Python `calculate_weak_interaction_cross_section(1e6)`). -/
def eNu_1MeV_eV : Nat := 1000000

/-- EQ-EC-SIGMA-01: paper envelope \(\sigma(1\,\mathrm{MeV})\lesssim 10^{-47}\,\mathrm{m}^2\).
    Python evaluates \(\sim 1.7\times 10^{-48}\,\mathrm{m}^2\) (stricter). -/
def sigma1MeV_negLog10Ceiling : Nat := 47

theorem sigma_envelope_is_1e_minus_47 :
    sigma1MeV_negLog10Ceiling = 47 := rfl

/-- Fermi \(\sigma \propto E_\nu^2\): Nat monotonicity of energy-squared. -/
theorem sigma_monotone_in_energy_sq
    {E1 E2 : Nat} (h : E1 ≤ E2) : E1 * E1 ≤ E2 * E2 :=
  Nat.mul_le_mul h h

theorem sigma_at_1MeV_energy_sq :
    eNu_1MeV_eV * eNu_1MeV_eV = 1000000000000 := by
  native_decide

/-- EQ-EC-RATE-01: room-temperature \(k_B T \approx 0.026\,\mathrm{eV} = 26\,\mathrm{meV}\). -/
def kT_room_meV : Nat := 26

/-- Dimensionless \(E_{\mathrm{th}}/(k_B T)\) using eV / meV integers:
    `threshold_eV * 1000 / kT_room_meV` (= 782000×1000/26). -/
def thermalExponentRoom : Nat := 30076923

/-- Taxonomy / paper floor \(\sim 3\times 10^{4}\) (conservative vs exact
    \(\sim 3\times 10^{7}\) at 300 K in SI). -/
def boltzmannExponentFloor : Nat := 30000

theorem thermal_exponent_room_from_inputs :
    thermalExponentRoom = threshold_eV * 1000 / kT_room_meV := by
  native_decide

theorem thermal_boltzmann_exponent_meets_floor :
    boltzmannExponentFloor ≤ thermalExponentRoom := by
  native_decide

/-- Thermal free-electron EC rate is Boltzmann-suppressed under the stated
    room-temperature bookkeeping. Does **not** close Q4. -/
def thermalEcRateNegligible : Prop :=
  boltzmannExponentFloor ≤ thermalExponentRoom

theorem thermal_ec_rate_negligible : thermalEcRateNegligible :=
  thermal_boltzmann_exponent_meets_floor

/-- Honesty: this module never asserts a condensed-matter EC energy path. -/
def condensedMatterPathToThreshold : Bool := false

theorem no_condensed_matter_path_claimed :
    condensedMatterPathToThreshold = false := rfl

/-- Nature-proof token (must remain false). -/
def lenrProved : Bool := false

theorem lenr_proved_false : lenrProved = false := rfl

theorem lenr_proved_false_implies_not_true :
    ¬ (lenrProved = true) := by
  simp [lenrProved]

/-!
## EQ-OPEN-EC-BOUND-01 — condensed-matter energy-budget deficit family

**Posture:** BOUNDED / form-DISPROVEN under the stated `AX` caps below — never
CLOSED. Proves that per-atom electrostatic / thermal reservoirs licensed by the
engine and paper cannot satisfy `q4ElectronCaptureSourceClosed`. Says nothing
about Widom–Larsen mass renormalization (`EQ-WL-MASS-01`, SPEC) or any other
collective concentration channel; those stay unproved and Q4 stays OPEN.
Cavitation / bubble-collapse energy concentration is a separate hydro scenario
and is not an input here. All energies are millielectronvolts so the 0.1 eV
double-layer and 26 meV room-temperature \(k_BT\) are exact Nats.
-/

/-- EC threshold \(0.782\,\mathrm{MeV}\) in meV. -/
def threshold_meV : Nat := 782000000

theorem threshold_meV_from_eV : threshold_meV = threshold_eV * 1000 := by
  decide

/-- AX (`EQ-CM-BUDGET-01` / IL-017): per-atom condensed-matter energy budget
    class 10–100 eV/atom (screening, coherence, interface fields). Governance
    cap, not a measured value. -/
def cmBudgetLo_meV : Nat := 10000
def cmBudgetHi_meV : Nat := 100000

/-- AX: interface double-layer band. Lower edge is the stated 0.1 eV
    (`DEFAULT_DELTA_V_FALLBACK_V`, `DOUBLE_LAYER_STATED_MEV`); upper edge 1 eV
    covers the engine work-function-difference class below. -/
def doubleLayerLo_meV : Nat := 100
def doubleLayerHi_meV : Nat := 1000

/-- Largest work function in `get_material_work_function` (iridium, 5.27 eV)
    and `H2_WORK_FUNCTION_EV` (4.5 eV), in meV. -/
def workFunctionMaxLookup_meV : Nat := 5270
def h2WorkFunction_meV : Nat := 4500

theorem cm_budget_band_ordered : cmBudgetLo_meV ≤ cmBudgetHi_meV := by decide

theorem double_layer_band_ordered : doubleLayerLo_meV ≤ doubleLayerHi_meV := by
  decide

theorem work_function_difference_in_double_layer_band :
    workFunctionMaxLookup_meV - h2WorkFunction_meV ≤ doubleLayerHi_meV := by
  decide

theorem double_layer_band_within_cm_budget :
    doubleLayerHi_meV ≤ cmBudgetHi_meV := by
  decide

theorem thermal_room_below_double_layer_band :
    kT_room_meV ≤ doubleLayerLo_meV := by
  decide

theorem cm_budget_cap_below_threshold : cmBudgetHi_meV < threshold_meV := by
  decide

/-- Family theorem: any supplied energy bounded by a cap strictly below the
    threshold leaves Q4 not closed. -/
theorem available_below_threshold_not_closed
    {availableEnergy cap : Nat}
    (hBudget : availableEnergy ≤ cap)
    (hCap : cap < threshold_meV) :
    ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV :=
  energy_deficit_implies_q4_not_closed (Nat.lt_of_le_of_lt hBudget hCap)

theorem cm_budget_does_not_close
    {availableEnergy : Nat}
    (h : availableEnergy ≤ cmBudgetHi_meV) :
    ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV :=
  available_below_threshold_not_closed h cm_budget_cap_below_threshold

theorem double_layer_band_does_not_close
    {availableEnergy : Nat}
    (h : availableEnergy ≤ doubleLayerHi_meV) :
    ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV :=
  cm_budget_does_not_close (Nat.le_trans h double_layer_band_within_cm_budget)

theorem thermal_room_does_not_close :
    ¬ q4ElectronCaptureSourceClosed kT_room_meV threshold_meV :=
  double_layer_band_does_not_close
    (Nat.le_trans thermal_room_below_double_layer_band double_layer_band_ordered)

/-- Named form-DISPROVEN predicate: no per-atom CM budget closes Q4. -/
def cmBudgetFormCannotClose : Prop :=
  ∀ availableEnergy : Nat, availableEnergy ≤ cmBudgetHi_meV →
    ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV

theorem cm_budget_form_cannot_close : cmBudgetFormCannotClose :=
  fun _ h => cm_budget_does_not_close h

theorem cm_budget_hi_deficit_factor : threshold_meV = 7820 * cmBudgetHi_meV := by
  decide

theorem cm_budget_lo_deficit_factor : threshold_meV = 78200 * cmBudgetLo_meV := by
  decide

theorem double_layer_hi_deficit_factor :
    threshold_meV = 782000 * doubleLayerHi_meV := by
  decide

/-- Per-atom budgets at the 100 eV cap that a closing mechanism would have to
    concentrate onto one capture. A requirement, not a claim one exists. -/
def minConcentrationAtCmCap : Nat := 7820

theorem sub_minimum_concentration_does_not_close
    {availableEnergy k : Nat}
    (hk : k < minConcentrationAtCmCap)
    (hE : availableEnergy ≤ k * cmBudgetHi_meV) :
    ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV := by
  apply available_below_threshold_not_closed hE
  unfold minConcentrationAtCmCap at hk
  unfold cmBudgetHi_meV threshold_meV
  omega

/-- Gap to CLOSED: any source satisfying the Q4 predicate lies outside the
    per-atom CM budget form. -/
theorem closing_source_exceeds_cm_budget
    {availableEnergy : Nat}
    (hClosed : q4ElectronCaptureSourceClosed availableEnergy threshold_meV) :
    cmBudgetHi_meV < availableEnergy :=
  Nat.lt_of_not_le (fun h => cm_budget_does_not_close h hClosed)

/-- The family refutes a source form, not the obligation: the Q4 predicate is
    still satisfiable by an above-threshold source (none licensed here), so
    `EQ-OPEN-EC-01` is OPEN rather than DISPROVEN. -/
theorem q4_not_refuted_outright :
    ¬ (∀ availableEnergy : Nat,
        ¬ q4ElectronCaptureSourceClosed availableEnergy threshold_meV) :=
  fun h => h threshold_meV (Nat.le_refl threshold_meV)

theorem ec_bounds_keep_honesty_locks :
    condensedMatterPathToThreshold = false ∧ lenrProved = false :=
  ⟨no_condensed_matter_path_claimed, lenr_proved_false⟩

end LenrFormal.WeakInteraction
