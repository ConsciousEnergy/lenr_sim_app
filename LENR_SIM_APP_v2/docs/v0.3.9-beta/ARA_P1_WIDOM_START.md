# ARA P1 — Widom–Larsen rebuild start (v0.3.9)

**Status:** Started after v0.3.8 P0 integrity foundation.  
**Does not** close `EQ-OPEN-EC-01` or endorse the mechanism.

## Scope (first rebuild)

1. Separate electroweak entrance-channel bookkeeping from the uncited
   `ULM_CHAIN_RATE_TO_ENHANCEMENT` simulator scale.
2. Expose sequence stages as first-class observables:
   SPP / mass renormalization → inverse β → ULM neutron → local capture.
3. Add paper-benchmark targets beyond the P0 Q-value / threshold falsifier.
4. Keep Tennfors critique citation visible.

## Scaffold in code

- Module remains `theories/widom_larsen.py` with `theory_model_version`
  progressing `widom_larsen_p0_v1` → `widom_larsen_p1_*` when equation fidelity
  lands.
- Provenance flag `p1_rebuild_status: started_scaffold` on contributions once
  P1 helpers land (see module).
- Branch naming: `consciousenergy/v039-p1-widom-98d8`.

## Exit for this rebuild (later PR)

- [ ] Cited conversion path or explicit free-param isolation for rate→enhancement
- [ ] ≥1 additional paper numeric/regime benchmark in CI
- [ ] Maturity axes update (`model_fidelity` upgrade only if equations match)
- [ ] EQ-OPEN-* still OPEN
