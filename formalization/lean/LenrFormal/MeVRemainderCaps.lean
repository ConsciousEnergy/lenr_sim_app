import LenrFormal.WorkingHypothesisBounds

/-!
MeVRemainderCaps — EQ-WH-MEV-CAP-01: positive Q1 remainder floor under engine caps.

**BOUNDED, not CLOSED.** EQ-OPEN-MEV-01 stays OPEN. Licensed channel
allocations (phonon, γ, recoil) are capped per channel; if the caps sum below
`Q` the open remainder is at least `R_min = Q − Σ caps > 0`, so
`q1MeVEnergyGapClosed` fails. Engine caps: phonon ≤ ⌈Q·10⁻³⌉ (EQ-WH-FC-01
weight floor), γ ≤ ⌈Q·BR_γ⌉ (stated branching input), recoil = 0
(`branching_model.recoil_mev`). Collapse / ENC hydro channels never allocate
the MeV nuclear remainder. No nuclear matrix element is supplied or assumed.
There is no theorem lenr_occurs.
-/

namespace LenrFormal.MeVRemainderCaps

open LenrFormal.OpenObligations
open LenrFormal.Constants
open LenrFormal.WorkingHypothesis
open LenrFormal.WorkingHypothesisBounds

/-! ### General cap bookkeeping -/

/-- `⌈Q · m / 1000⌉`: keV cap covering any fraction of `Q` at most `m` milli. -/
def capKeVOfMilli (Q m : Nat) : Nat := (Q * m + 999) / 1000

/-- A fraction at most `m` milli of `Q` fits under `capKeVOfMilli Q m`. -/
theorem fraction_le_cap {Q m e : Nat} (h : 1000 * e ≤ Q * m) :
    e ≤ capKeVOfMilli Q m := by
  unfold capKeVOfMilli
  generalize Q * m = p at *
  omega

/-- Allocations (keV) of the licensed Q1 channels in `energy_partition_mev`. -/
structure LicensedAllocation where
  phononKeV : Nat
  gammaKeV : Nat
  recoilKeV : Nat

/-- Per-channel caps (keV) on `LicensedAllocation`. -/
structure ChannelCaps where
  phononCapKeV : Nat
  gammaCapKeV : Nat
  recoilCapKeV : Nat

def WithinCaps (a : LicensedAllocation) (c : ChannelCaps) : Prop :=
  a.phononKeV ≤ c.phononCapKeV ∧ a.gammaKeV ≤ c.gammaCapKeV ∧
    a.recoilKeV ≤ c.recoilCapKeV

def allocatedKeV (a : LicensedAllocation) : Nat :=
  a.phononKeV + a.gammaKeV + a.recoilKeV

def capSumKeV (c : ChannelCaps) : Nat :=
  c.phononCapKeV + c.gammaCapKeV + c.recoilCapKeV

/-- Open remainder after the licensed allocation (engine `max(Q − Σ, 0)`). -/
def openRemainderUnder (Q : Nat) (a : LicensedAllocation) : Nat :=
  Q - allocatedKeV a

/-- `R_min = Q − Σ caps`. -/
def remainderFloor (Q : Nat) (c : ChannelCaps) : Nat :=
  Q - capSumKeV c

theorem allocated_le_cap_sum {a : LicensedAllocation} {c : ChannelCaps}
    (h : WithinCaps a c) : allocatedKeV a ≤ capSumKeV c := by
  obtain ⟨hp, hg, hr⟩ := h
  unfold allocatedKeV capSumKeV
  omega

/-- EQ-WH-PART-02 applied to the licensed allocation. -/
theorem allocation_partition (Q : Nat) (a : LicensedAllocation)
    (h : allocatedKeV a ≤ Q) : allocatedKeV a + openRemainderUnder Q a = Q :=
  partition_general _ _ h

theorem floor_le_remainder (Q : Nat) {a : LicensedAllocation} {c : ChannelCaps}
    (h : WithinCaps a c) : remainderFloor Q c ≤ openRemainderUnder Q a := by
  have := allocated_le_cap_sum h
  unfold remainderFloor openRemainderUnder
  omega

theorem floor_pos_iff (Q : Nat) (c : ChannelCaps) :
    0 < remainderFloor Q c ↔ capSumKeV c < Q := by
  unfold remainderFloor
  omega

/-- Capped licensed channels with `R_min > 0` leave Q1 open. -/
theorem caps_leave_positive_remainder (Q : Nat) {a : LicensedAllocation}
    {c : ChannelCaps} (hCaps : WithinCaps a c) (hR : 0 < remainderFloor Q c) :
    remainderFloor Q c ≤ openRemainderUnder Q a ∧
      ¬ q1MeVEnergyGapClosed (openRemainderUnder Q a) :=
  ⟨floor_le_remainder Q hCaps,
    positive_remainder_implies_q1_not_closed
      (Nat.lt_of_lt_of_le hR (floor_le_remainder Q hCaps))⟩

/-- Contrapositive: zeroing the remainder within caps needs `Σ caps ≥ Q`. -/
theorem q1_closed_under_caps_requires_cap_sum (Q : Nat) {a : LicensedAllocation}
    {c : ChannelCaps} (hCaps : WithinCaps a c)
    (hClosed : q1MeVEnergyGapClosed (openRemainderUnder Q a)) :
    Q ≤ capSumKeV c := by
  have hFloor := floor_le_remainder Q hCaps
  unfold q1MeVEnergyGapClosed at hClosed
  unfold remainderFloor at hFloor
  omega

/-! ### Engine caps -/

/-- Phonon weight cap (milli): FC floor `⌊1000·P_N⌋ = 0` ⇒ `1000·P_N < 1`. -/
def fcPhononCapMilli : Nat := fcPhononWeightMilli + 1

theorem fc_phonon_cap_milli_value : fcPhononCapMilli = 1 := rfl

/-- Phonon channel cap `⌈Q·10⁻³⌉ = 24 keV` (loose; FC gives `log10 P_N ≤ −7×10⁵`). -/
def phononCapKeV : Nat := capKeVOfMilli qDD_He4_keV fcPhononCapMilli

theorem phonon_cap_keV_value : phononCapKeV = 24 := by decide

/-- Recoil channel cap: engine `recoil_mev = 0`; α stopping is not counted
    (EQ-WH-STOP-01, `counted_in_derived_mev = False`). -/
def recoilCapKeV : Nat := 0

/-- Engine caps at a stated γ branching `BR_γ` (milli). `BR_γ` is an input
    (engine default assumed 0), not a derived or measured value. -/
def engineCaps (gammaBranchingMilli : Nat) : ChannelCaps :=
  ⟨phononCapKeV, capKeVOfMilli qDD_He4_keV gammaBranchingMilli, recoilCapKeV⟩

/-- Explicit `R_min` under engine caps. -/
def engineRemainderFloor (gammaBranchingMilli : Nat) : Nat :=
  remainderFloor qDD_He4_keV (engineCaps gammaBranchingMilli)

theorem engine_floor_at_default_branching : engineRemainderFloor 0 = 23776 := by
  decide

theorem engine_floor_at_998 : engineRemainderFloor 998 = 23 := by decide

theorem engine_floor_at_999 : engineRemainderFloor 999 = 0 := by decide

theorem engine_floor_pos (gammaBranchingMilli : Nat) (h : gammaBranchingMilli ≤ 998) :
    0 < engineRemainderFloor gammaBranchingMilli := by
  unfold engineRemainderFloor remainderFloor capSumKeV engineCaps capKeVOfMilli
  rw [phonon_cap_keV_value]
  unfold recoilCapKeV qDD_He4_keV
  simp only
  omega

/-- EQ-WH-MEV-CAP-01: under engine caps with `BR_γ ≤ 0.998`, every licensed
    allocation leaves remainder `≥ R_min > 0`, so Q1 is not closed. -/
theorem engine_licensed_channels_leave_positive_remainder
    (gammaBranchingMilli : Nat) (hBr : gammaBranchingMilli ≤ 998)
    {a : LicensedAllocation} (hCaps : WithinCaps a (engineCaps gammaBranchingMilli)) :
    0 < engineRemainderFloor gammaBranchingMilli ∧
      engineRemainderFloor gammaBranchingMilli ≤ openRemainderUnder qDD_He4_keV a ∧
      ¬ q1MeVEnergyGapClosed (openRemainderUnder qDD_He4_keV a) :=
  let hR := engine_floor_pos gammaBranchingMilli hBr
  ⟨hR, caps_leave_positive_remainder qDD_He4_keV hCaps hR⟩

/-- Engine default (assumed `BR_γ = 0`): `R_min = 23776 keV`. -/
theorem engine_default_remainder_floor {a : LicensedAllocation}
    (hCaps : WithinCaps a (engineCaps 0)) :
    23776 ≤ openRemainderUnder qDD_He4_keV a ∧
      ¬ q1MeVEnergyGapClosed (openRemainderUnder qDD_He4_keV a) := by
  have h := engine_licensed_channels_leave_positive_remainder 0 (by decide) hCaps
  rw [engine_floor_at_default_branching] at h
  exact ⟨h.2.1, h.2.2⟩

/-- The WH-ENP-01 default row (`derivedKeV = 0`) sits inside the engine caps
    and reproduces `openRemainderKeV`. -/
def whDefaultAllocation : LicensedAllocation := ⟨derivedKeV, 0, 0⟩

theorem wh_default_within_engine_caps : WithinCaps whDefaultAllocation (engineCaps 0) := by
  unfold WithinCaps
  decide

theorem wh_default_remainder_matches :
    openRemainderUnder qDD_He4_keV whDefaultAllocation = openRemainderKeV := rfl

/-- Zeroing the remainder within engine caps forces `BR_γ ≥ 0.999`. -/
theorem q1_closure_under_engine_caps_forces_gamma_route
    (gammaBranchingMilli : Nat) {a : LicensedAllocation}
    (hCaps : WithinCaps a (engineCaps gammaBranchingMilli))
    (hClosed : q1MeVEnergyGapClosed (openRemainderUnder qDD_He4_keV a)) :
    999 ≤ gammaBranchingMilli := by
  apply Nat.le_of_not_lt
  intro hLt
  exact (engine_licensed_channels_leave_positive_remainder gammaBranchingMilli
    (Nat.le_of_lt_succ hLt) hCaps).2.2 hClosed

/-- … and that γ route fails Q2 against any detector upper bound `< 0.999`. -/
theorem gamma_route_closure_fails_q2
    (gammaBranchingMilli upperBound : Nat) {a : LicensedAllocation}
    (hCaps : WithinCaps a (engineCaps gammaBranchingMilli))
    (hClosed : q1MeVEnergyGapClosed (openRemainderUnder qDD_He4_keV a))
    (hUpper : upperBound < 999) :
    ¬ q2RadiationSuppressionClosed gammaBranchingMilli upperBound :=
  gamma_above_bound_implies_q2_not_closed
    (Nat.lt_of_lt_of_le hUpper
      (q1_closure_under_engine_caps_forces_gamma_route gammaBranchingMilli hCaps hClosed))

/-! ### Collapse / ENC hydro do not allocate the MeV nuclear remainder -/

inductive EnergyChannel
  | phonon
  | gamma
  | recoil
  | collapseHydro
  | encHydro

/-- Only nuclear-partition channels may allocate Q1 energy. Collapse / ENC
    hydro heat (CollapseBounds clamps) is a scenario factor, not a channel. -/
def allocatesMeVRemainder : EnergyChannel → Bool
  | .collapseHydro => false
  | .encHydro => false
  | _ => true

def nuclearAllocationKeV (ch : EnergyChannel) (claimedKeV : Nat) : Nat :=
  if allocatesMeVRemainder ch then claimedKeV else 0

theorem hydro_channels_allocate_zero (claimedKeV : Nat) :
    nuclearAllocationKeV .collapseHydro claimedKeV = 0 ∧
      nuclearAllocationKeV .encHydro claimedKeV = 0 :=
  ⟨rfl, rfl⟩

/-- Remainder after licensed allocation plus any collapse / ENC hydro claim. -/
def openRemainderWithHydro (Q : Nat) (a : LicensedAllocation)
    (collapseClaimKeV encClaimKeV : Nat) : Nat :=
  Q - (allocatedKeV a + nuclearAllocationKeV .collapseHydro collapseClaimKeV +
    nuclearAllocationKeV .encHydro encClaimKeV)

theorem hydro_claims_do_not_change_remainder (Q : Nat) (a : LicensedAllocation)
    (collapseClaimKeV encClaimKeV : Nat) :
    openRemainderWithHydro Q a collapseClaimKeV encClaimKeV = openRemainderUnder Q a := by
  simp [openRemainderWithHydro, nuclearAllocationKeV, allocatesMeVRemainder,
    openRemainderUnder]

/-- Arbitrary collapse / ENC hydro claims leave the engine-cap floor intact. -/
theorem hydro_claims_keep_q1_open
    (gammaBranchingMilli : Nat) (hBr : gammaBranchingMilli ≤ 998)
    {a : LicensedAllocation} (hCaps : WithinCaps a (engineCaps gammaBranchingMilli))
    (collapseClaimKeV encClaimKeV : Nat) :
    ¬ q1MeVEnergyGapClosed
      (openRemainderWithHydro qDD_He4_keV a collapseClaimKeV encClaimKeV) := by
  rw [hydro_claims_do_not_change_remainder]
  exact (engine_licensed_channels_leave_positive_remainder gammaBranchingMilli hBr hCaps).2.2

end LenrFormal.MeVRemainderCaps
