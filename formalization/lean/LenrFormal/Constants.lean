/-!
Constants — integer / natural anchors congruent with IR adopted values.
-/

namespace LenrFormal.Constants

/-- Governance cap `MAX_ENHANCEMENT_FACTOR` (RR-001). -/
def maxEnhancementFactor : Nat := 100000

/-- Rydberg E₀ in milli-eV (13.6 eV = 13600 meV). -/
def rydbergE0_meV : Nat := 13600

/-- D+D → ⁴He Q in keV (23.8 MeV = 23800 keV). -/
def qDD_He4_keV : Nat := 23800

/-- Miles reference rate ÷ 10⁹ (so 263 ↔ 2.63×10¹¹). -/
def milesRate_div_1e9 : Nat := 263

/-- Casimir check: A/d⁴ = 10²⁴ (stored as exponent). -/
def casimirGeometryExp : Nat := 24

/-- Adopted |F| in µN for check geometry (1.3 mN = 1300 µN). -/
def casimirForce_uN : Nat := 1300

/-- Band half-width 5% ≈ 65 µN. -/
def casimirBandHalf_uN : Nat := 65

end LenrFormal.Constants
