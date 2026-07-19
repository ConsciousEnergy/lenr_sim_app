---
name: wolfram-verification
description: >-
  Verify physical constants, equations, and derived numeric results against
  WolframAlpha via the user-wolframalpha MCP server, then record the check in the
  equation-verification log. Use when adding or changing a constant, equation, or
  hardcoded physics number, when a value's magnitude is in doubt, or before
  releasing physics changes (numeric quality gate).
---

# Wolfram Verification

## Overview

Independently verify physics numbers before trusting them. Constants, equations,
and any hardcoded value that drives predictions are checked against WolframAlpha
(the `user-wolframalpha` MCP server), compared to the code value, and logged in
`LENR_SIM_APP_v2/docs/PHYSICS_EQUATION_VERIFICATION.md`. This is the numeric arm
of the science quality gate and complements [scientific-rigor-provenance.mdc](../../rules/scientific-rigor-provenance.mdc).

## When to Use

- Adding or changing a physical constant, equation, or hardcoded calibration number.
- A result's magnitude looks wrong or is disputed (e.g. tunneling enhancement, Casimir force).
- Before releasing physics changes - run as a numeric gate on new/changed values.

## Process

```
- [ ] 1. Extract the exact value/equation + units from the code
- [ ] 2. Query WolframAlpha via MCP (get_simple_answer or ask_llm)
- [ ] 3. Compare to the code value at matching units and sig figs
- [ ] 4. Classify status and confirm it sits in the adopted band
- [ ] 5. Append/update the entry in the verification log
```

**Step 2 - use the MCP tools** (authenticate first if the server needs it):

- `get_simple_answer` - a single value or short result (best for constants).
- `ask_llm` - structured multi-format output (best for equations/derivations).

```
Call user-wolframalpha / get_simple_answer
  query: "reduced Planck constant in J s"
Call user-wolframalpha / ask_llm
  query: "Casimir force between two plates area 1 cm^2 separation 10 nm"
```

If a call fails with an auth error, call `user-wolframalpha / mcp_auth` once, then retry.

**Step 4 - classify** using the log's legend: `VERIFIED` (matches reference),
`APPROXIMATION` (valid within stated limits), `EXPERIMENTAL` (LENR observation),
`REFERENCE` (standard equation with citation). Confirm the value respects the
adopted numeric bands (e.g. tunneling 10^3-10^5, Casimir -1.3 mN) - a WolframAlpha
match that violates a band means the model/units are wrong, not the band.

**Step 5 - log entry template** (match the existing doc style; the value sits in its own fenced block):

````markdown
### X.Y <Quantity name>
```
<equation or value with units>
```
**Status:** VERIFIED
**Code:** `SYMBOL = <code value>`  (file: physics_engine/...py)
**WolframAlpha:** <returned value> (query: "<exact query>")
**Reference:** <CODATA 2018 | citation key>  (verified <date>)
````

## Rationalizations (excuses -> rebuttal)

- "It's a standard constant, obviously correct." -> Then the check takes one query and confirms units/sig figs; unit slips are the common bug.
- "The test already passes." -> Tests lock behavior, not physical correctness; a wrong-but-consistent constant passes its own test.
- "WolframAlpha is external, skip it." -> It is the independent oracle; a self-consistent number is not a verified number.

## Red Flags

- A code value and WolframAlpha differ by an order of magnitude (unit error) or a sign.
- A hardcoded number with no citation key and no `model assumption` label.
- A verified value that contradicts an adopted band (re-check units/derivation).

## Verification

- The changed constant/equation has a dated entry in `PHYSICS_EQUATION_VERIFICATION.md` with the exact query and returned value.
- Units and significant figures match; magnitude sits in the adopted band.
- Citation or `model assumption` label present per the citation/rigor rules.
