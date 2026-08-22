/-!
RealShim — bridge axiom for Gamow anti-monotonicity.

Replace with mathlib `Real.exp` facts when the project depends on mathlib.
-/

namespace LenrFormal.RealShim

/-- Abstract exponential on integers (proxy for Real.exp on a scaled domain). -/
opaque expZ : Int → Int

/-- Strict monotonicity bridge. -/
axiom expZ_strict_mono : ∀ {x y : Int}, x < y → expZ x < expZ y

end LenrFormal.RealShim
