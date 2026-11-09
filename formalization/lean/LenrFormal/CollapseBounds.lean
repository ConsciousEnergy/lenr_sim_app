/-!
CollapseBounds — EQ-BBL-LIM-01 / EQ-BBL-BOUND-01 / EQ-BBL-UQ-01 /
EQ-BBL-RP-DOM-01 / EQ-BBL-CR-CAP-01.

Calculated collapse outputs are reported through a pointwise upper clamp.
Literature ceilings, UQ percentile keys, RP/KM Mach-domain gates, and the
hard-core compression cap are integer bookkeeping mirrors of the Python
engine — not solver-validity or physical-necessity theorems.

Ledger `ENG-BUBBLE-FUSION-01` remains approximate; `ENG-RP-KM-01` remains
approximate live hydro. No cavitation-dynamics “proved LENR” theorem.
No `EQ-OPEN-*` is discharged. `lenr_proved` stays false.
-/

namespace LenrFormal.CollapseBounds

/-- Pointwise reporting clamp: `min(raw, bound)`. -/
def clamped (raw bound : Nat) : Nat := Nat.min raw bound

/-- The raw value exceeds its calculated bound. -/
def saturated (raw bound : Nat) : Prop := bound < raw

theorem clamped_le_bound (raw bound : Nat) :
    clamped raw bound ≤ bound :=
  Nat.min_le_right _ _

theorem clamped_eq_bound_of_saturated
    {raw bound : Nat}
    (h : saturated raw bound) :
    clamped raw bound = bound := by
  unfold saturated at h
  exact Nat.min_eq_right (Nat.le_of_lt h)

theorem clamped_eq_raw_of_not_saturated
    {raw bound : Nat}
    (h : raw ≤ bound) :
    clamped raw bound = raw := by
  exact Nat.min_eq_left h

theorem clamped_idempotent (raw bound : Nat) :
    clamped (clamped raw bound) bound = clamped raw bound := by
  simp [clamped, Nat.min_assoc, Nat.min_self]

theorem clamped_le_raw (raw bound : Nat) :
    clamped raw bound ≤ raw :=
  Nat.min_le_left _ _

/-- EQ-BBL-BOUND-01: Flannigan & Suslick emission-band upper (K). -/
def emissionBandUpper_K : Nat := 15000

/-- EQ-BBL-BOUND-01: Moss et al. peak ion temperature ceiling (K). -/
def mossIonCeiling_K : Nat := 2000000

/-- EQ-BBL-BOUND-01: Sonoluminescence shock-pressure literature bound (Pa). -/
def shockPressureCeiling_Pa : Nat := 10000000000

/-- EQ-BBL-BOUND-01: Compressibility Mach threshold ×10 (0.3 → 3). -/
def compressibilityMachThreshold_x10 : Nat := 3

theorem emission_band_lt_moss_ion :
    emissionBandUpper_K < mossIonCeiling_K := by
  native_decide

theorem shock_pressure_ceiling_pos :
    0 < shockPressureCeiling_Pa := by
  native_decide

/--
EQ-BBL-RP-DOM-01 / ENG-RP-KM-01: RP domain holds strictly below the
compressibility Mach threshold (×10 bookkeeping). Domain predicate only —
not a Keller–Miksis existence theorem and not a nuclear-rate claim.
-/
def rpDomain (peakMach_x10 : Nat) : Prop :=
  peakMach_x10 < compressibilityMachThreshold_x10

/-- KM is preferred once Mach reaches the compressibility threshold. -/
def kmPreferred (peakMach_x10 : Nat) : Prop :=
  compressibilityMachThreshold_x10 ≤ peakMach_x10

/-- RP formula is claimed only in RP mode inside the low-Mach domain. -/
def rpFormulaClaimed (peakMach_x10 : Nat) (isRayleighPlesset : Bool) : Prop :=
  isRayleighPlesset = true ∧ rpDomain peakMach_x10

theorem km_preferred_iff_not_rp_domain (peakMach_x10 : Nat) :
    kmPreferred peakMach_x10 ↔ ¬ rpDomain peakMach_x10 := by
  unfold kmPreferred rpDomain
  constructor
  · intro hLe hLt
    exact (Nat.lt_irrefl _) (Nat.lt_of_lt_of_le hLt hLe)
  · intro hNotLt
    exact Nat.le_of_not_gt hNotLt

theorem high_mach_not_rp_domain :
    ¬ rpDomain compressibilityMachThreshold_x10 := by
  intro h
  exact (Nat.lt_irrefl _) h

theorem high_mach_km_preferred :
    kmPreferred compressibilityMachThreshold_x10 := by
  unfold kmPreferred
  exact Nat.le_refl _

theorem km_mode_not_rp_claimed (peakMach_x10 : Nat) :
    ¬ rpFormulaClaimed peakMach_x10 false := by
  intro h
  exact Bool.noConfusion h.1

theorem high_mach_rp_mode_not_claimed :
    ¬ rpFormulaClaimed compressibilityMachThreshold_x10 true := by
  intro h
  exact high_mach_not_rp_domain h.2

theorem low_mach_rp_claimed :
    rpFormulaClaimed 2 true := by
  refine ⟨rfl, ?_⟩
  unfold rpDomain compressibilityMachThreshold_x10
  decide

/--
Select the temperature ceiling using the same regime rule as
`temperature_calculated_bound_k`: RP + Mach < 0.3 → emission band;
otherwise Moss ion ceiling. `peakMach_x10` and `isRayleighPlesset` are
Nat/Bool bookkeeping, not a hydrodynamics theorem.
-/
def temperatureBound_K (peakMach_x10 : Nat) (isRayleighPlesset : Bool) : Nat :=
  if peakMach_x10 < compressibilityMachThreshold_x10 && isRayleighPlesset then
    emissionBandUpper_K
  else
    mossIonCeiling_K

theorem temperature_bound_rp_subsonic :
    temperatureBound_K 2 true = emissionBandUpper_K := by
  native_decide

theorem temperature_bound_supersonic :
    temperatureBound_K 3 true = mossIonCeiling_K := by
  native_decide

theorem temperature_bound_km_subsonic :
    temperatureBound_K 2 false = mossIonCeiling_K := by
  native_decide

theorem temperature_bound_eq_emission_of_rp_claimed
    {peakMach_x10 : Nat}
    (h : rpFormulaClaimed peakMach_x10 true) :
    temperatureBound_K peakMach_x10 true = emissionBandUpper_K := by
  unfold rpFormulaClaimed rpDomain at h
  have hDom : peakMach_x10 < compressibilityMachThreshold_x10 := h.2
  unfold temperatureBound_K
  simp [hDom]

theorem temperature_bound_eq_moss_of_km_preferred
    (peakMach_x10 : Nat) (isRayleighPlesset : Bool)
    (h : kmPreferred peakMach_x10) :
    temperatureBound_K peakMach_x10 isRayleighPlesset = mossIonCeiling_K := by
  unfold kmPreferred at h
  unfold temperatureBound_K
  have hNotLt : ¬ peakMach_x10 < compressibilityMachThreshold_x10 :=
    Nat.not_lt.mpr h
  simp [hNotLt]

/--
EQ-BBL-UQ-01: reported percentile levels matching
`collapse_uq.PERCENTILES = (5, 25, 50, 75, 95)`.
Definitions only — not a claim that samples are physically calibrated.
-/
def uqPercentileP05 : Nat := 5
def uqPercentileP25 : Nat := 25
def uqPercentileP50 : Nat := 50
def uqPercentileP75 : Nat := 75
def uqPercentileP95 : Nat := 95

def uqPercentiles : List Nat :=
  [uqPercentileP05, uqPercentileP25, uqPercentileP50, uqPercentileP75, uqPercentileP95]

theorem uq_percentile_count : uqPercentiles.length = 5 := by
  native_decide

theorem uq_percentiles_ascending :
    uqPercentileP05 < uqPercentileP25
    ∧ uqPercentileP25 < uqPercentileP50
    ∧ uqPercentileP50 < uqPercentileP75
    ∧ uqPercentileP75 < uqPercentileP95 := by
  native_decide

theorem uq_percentiles_le_100 :
    uqPercentileP95 ≤ 100 := by
  native_decide

/-- Fractional compression-ratio tolerance as percent (0.20 → 20). -/
def compressionRatioTolerancePct : Nat := 20

/-- Fractional polytropic-index tolerance as percent (0.05 → 5). -/
def polytropicIndexTolerancePct : Nat := 5

theorem compression_tolerance_pct_value :
    compressionRatioTolerancePct = 20 := rfl

theorem polytropic_tolerance_pct_value :
    polytropicIndexTolerancePct = 5 := rfl

/--
EQ-BBL-UQ-01: number of Sobol input dimensions in
`collapse_uq._SAMPLED_DIMENSIONS` (screening, CR, γ).
-/
def uqSampledDimensionCount : Nat := 3

theorem uq_sampled_dimension_count_value :
    uqSampledDimensionCount = 3 := rfl

/--
EQ-BBL-CR-CAP-01: van der Waals hard-core compression-ratio floor matching
`BubbleLatticeInteraction.MAX_COMPRESSION_RATIO`. Bookkeeping cap only.
-/
def maxCompressionRatio : Nat := 1000

theorem max_compression_ratio_pos :
    0 < maxCompressionRatio := by
  native_decide

/--
Clamped temperature report under a calculated bound (EQ-BBL-LIM-01 applied
to the EQ-BBL-BOUND-01 ceiling). Bookkeeping identity only.
-/
def reportedTemperature_K
    (raw_K peakMach_x10 : Nat) (isRayleighPlesset : Bool) : Nat :=
  clamped raw_K (temperatureBound_K peakMach_x10 isRayleighPlesset)

theorem reported_temperature_le_bound
    (raw_K peakMach_x10 : Nat) (isRayleighPlesset : Bool) :
    reportedTemperature_K raw_K peakMach_x10 isRayleighPlesset
      ≤ temperatureBound_K peakMach_x10 isRayleighPlesset :=
  clamped_le_bound _ _

theorem reported_temperature_le_raw
    (raw_K peakMach_x10 : Nat) (isRayleighPlesset : Bool) :
    reportedTemperature_K raw_K peakMach_x10 isRayleighPlesset ≤ raw_K :=
  clamped_le_raw _ _

theorem reported_temperature_eq_bound_of_saturated
    {raw_K peakMach_x10 : Nat} {isRayleighPlesset : Bool}
    (h : saturated raw_K (temperatureBound_K peakMach_x10 isRayleighPlesset)) :
    reportedTemperature_K raw_K peakMach_x10 isRayleighPlesset
      = temperatureBound_K peakMach_x10 isRayleighPlesset :=
  clamped_eq_bound_of_saturated h

theorem reported_temperature_eq_raw_of_not_saturated
    {raw_K peakMach_x10 : Nat} {isRayleighPlesset : Bool}
    (h : raw_K ≤ temperatureBound_K peakMach_x10 isRayleighPlesset) :
    reportedTemperature_K raw_K peakMach_x10 isRayleighPlesset = raw_K :=
  clamped_eq_raw_of_not_saturated h

/-- Pressure report capped at the shock literature ceiling. -/
def reportedPressure_Pa (raw_Pa : Nat) : Nat :=
  clamped raw_Pa shockPressureCeiling_Pa

theorem reported_pressure_le_shock_ceiling (raw_Pa : Nat) :
    reportedPressure_Pa raw_Pa ≤ shockPressureCeiling_Pa :=
  clamped_le_bound _ _

theorem reported_pressure_eq_ceiling_of_saturated
    {raw_Pa : Nat}
    (h : saturated raw_Pa shockPressureCeiling_Pa) :
    reportedPressure_Pa raw_Pa = shockPressureCeiling_Pa :=
  clamped_eq_bound_of_saturated h

theorem reported_pressure_eq_raw_of_not_saturated
    {raw_Pa : Nat}
    (h : raw_Pa ≤ shockPressureCeiling_Pa) :
    reportedPressure_Pa raw_Pa = raw_Pa :=
  clamped_eq_raw_of_not_saturated h

/-- Compression ratio capped at the hard-core floor (EQ-BBL-CR-CAP-01). -/
def reportedCompressionRatio (raw : Nat) : Nat :=
  clamped raw maxCompressionRatio

theorem reported_compression_le_cap (raw : Nat) :
    reportedCompressionRatio raw ≤ maxCompressionRatio :=
  clamped_le_bound _ _

end LenrFormal.CollapseBounds
