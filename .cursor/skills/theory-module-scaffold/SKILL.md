---
name: theory-module-scaffold
description: >-
  Scaffold a new LENR physics theory module that satisfies the TheoryModule
  protocol and wire it into the pipeline, scoring, relationships, visualization
  map, and tests. Use when adding a new theory/mechanism under
  physics_engine/theories/ or when the user asks to add or register a theory.
---

# Theory Module Scaffold

## Overview

Adding a theory is a repeated, multi-file task. This skill produces a
protocol-compliant module and wires every touchpoint so the theory is
selectable, scored, related, visualized, cited, and tested - in one pass, in the
right order, so nothing is left half-connected.

## When to Use

- Adding a new LENR mechanism under `LENR_SIM_APP_v2/backend/app/physics_engine/theories/`.
- Registering or re-enabling a theory in the pipeline.

## Process

```
- [ ] 1. Create theories/<theory_id>.py implementing TheoryModule
- [ ] 2. Register it in theory_pipeline.py (try/except block)
- [ ] 3. Add relationships in theory_relationships/defaults.py
- [ ] 4. Add a theoryVisualizationMap.js entry (frontend) with a claim tier tag
- [ ] 5. Add references per scientific-citations rule; set claim_tier/provenance
- [ ] 6. Add a test in tests/test_theory_modules.py
- [ ] 7. Run the theory + integration suites
```

**Step 1 - module template** (mirror `theories/*.py`; cap enhancement, cite sources):

```python
"""<Author>'s <Mechanism> Theory Module.

Physics: <one-paragraph mechanism>.

References:
    <Author> (<Year>) <Venue> — <citationkey>
"""
from __future__ import annotations
import math
from typing import Any, Dict, Optional

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR


class <Name>Theory:
    @property
    def theory_id(self) -> str: return "<theory_id>"

    @property
    def theory_name(self) -> str: return "<Display Name>"

    @property
    def description(self) -> str:
        return "<short prose description>"

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {"<param>": {"default": 1.0, "description": "<what/units>"}}

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        # Guard clause: return False when regime assumptions are not met
        return conditions.get("loading_ratio", 0) > 0.5

    def calculate(self, conditions: Dict[str, float],
                  config: Optional[Dict[str, Any]] = None) -> TheoryContribution:
        config = config or {}
        if not self.is_applicable(conditions):
            return self._neutral("regime not satisfied")

        enhancement = min(1.0 + <derived_factor>, MAX_ENHANCEMENT_FACTOR)  # capped (IL/RR)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=<watts>,
            observables={"product_He4": 1.0, "product_neutrons": 0.01, "product_gamma": 0.0},
            parameters_used={"loading_ratio": conditions.get("loading_ratio", 0.9)},
            is_applicable=True,
            confidence=<0..1>,
            references=["<Author> (<Year>), <Venue>, <vol/pp> — <citationkey>"],
            claim_tier="speculative_exploratory",   # start conservative
            evidence_class="exploratory",
            provenance={"source": "<key/derivation>", "validation_status": "unvalidated",
                        "model_version": "<contract/model>"},
            falsification_conditions=["<observable that would refute this>"],
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id, theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=["<Author> (<Year>), <Venue> — <citationkey>"],
            category="primary",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        return TheoryContribution(theory_id=self.theory_id, theory_name=self.theory_name,
                                  is_applicable=False, confidence=0.0)
```

**Step 2 - register** in `theory_pipeline.py` (each theory has its own guarded block):

```python
try:
    from app.physics_engine.theories.<theory_id> import <Name>Theory
    pipeline.register(<Name>Theory())
except Exception:
    logger.exception("Failed to register <Name>Theory")
```

Gate experimental/legacy theories behind a setting (e.g. `if getattr(settings, "ENABLE_<FLAG>", False):`) like `ENABLE_LEGACY_HYDROTON`.

**Step 6 - test** in `tests/test_theory_modules.py` (reuse the existing helpers):

```python
def test_<theory_id>_protocol_and_calc():
    from app.physics_engine.theories.<theory_id> import <Name>Theory
    theory = <Name>Theory()
    assert_theory_protocol(theory)
    contrib = theory.calculate(STANDARD_CONDITIONS)
    assert_valid_contribution(contrib)
    assert contrib.enhancement_factor <= 1e5   # MAX_ENHANCEMENT_FACTOR
```

Run:

```bash
cd LENR_SIM_APP_v2/backend
pytest tests/test_theory_modules.py tests/test_integration -q
```

## Rationalizations (excuses -> rebuttal)

- "I'll just add the module, wiring later." -> An unregistered theory is invisible and untested; do all touchpoints in one pass.
- "It clearly works, skip the claim tier." -> Every contribution needs a claim_tier + provenance or it is non-release-ready (governance rule).
- "No cap needed, my factor is small." -> Always clamp to `MAX_ENHANCEMENT_FACTOR`; unbounded factors are the classic magnitude bug.

## Red Flags

- `enhancement_factor` not clamped to `MAX_ENHANCEMENT_FACTOR` (1e5).
- `references` without a resolvable citation key (see [scientific-citations.mdc](../../rules/scientific-citations.mdc)).
- Missing `claim_tier` / `provenance` / `falsification_conditions`.
- Registered but no relationships, viz-map entry, or test.

## Verification

- `assert_theory_protocol` + `assert_valid_contribution` pass for the new module.
- Theory appears in `GET /api/physics/theories` and runs via the pipeline.
- Enhancement is capped; references carry keys; claim_tier/provenance set.
- `pytest tests/test_theory_modules.py tests/test_integration` stays green.

See [reference.md](reference.md) for the field reference and every wiring touchpoint.
