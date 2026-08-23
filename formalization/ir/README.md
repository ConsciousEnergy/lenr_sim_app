# Equation Intermediate Representation (IR)

Machine-checkable front-end for paper ↔ code ↔ Lean ↔ Wolfram.

## Layout

- `equations/*.yaml` — one file per equation ID (or a tightly related cluster).
- Schema fields: `id`, `latex`, `symbols`, `units`, `tag`, `paper_ref`, `code_refs`, `citation_keys`, `lean_target`, `lean_decls`, `adopted_value` (optional), `notes`.
- `lean_decls` is a nonempty list of fully qualified Lean names that must exist in `lean_target`. `THM` rows must include a `theorem` or `lemma`.

## Commands

```bash
# From repo root
python formalization/scripts/check_ir.py
python formalization/scripts/diff_code_literals.py
```

Exit code 0 = every IR row has a resolvable Lean module, declared `lean_decls`, valid code refs, and a taxonomy entry; every Lean module is imported by `LenrFormal.lean`; every `EQ-*` literal in `open_questions.py`, `open_question_details.py`, and `decision_oracle.py` resolves to IR or taxonomy. Non-zero lists gaps.

## Backends

| Backend | Role |
|---------|------|
| Lean `lake build` | Symbolic / proof gate for `THM` |
| Wolfram log | Numeric oracle (`PHYSICS_EQUATION_VERIFICATION.md`) |
| Pytest science gates | Empirical falsifiers |
