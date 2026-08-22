# Equation Intermediate Representation (IR)

Machine-checkable front-end for paper ↔ code ↔ Lean ↔ Wolfram.

## Layout

- `equations/*.yaml` — one file per equation ID (or a tightly related cluster).
- Schema fields: `id`, `latex`, `symbols`, `units`, `tag`, `paper_ref`, `code_refs`, `citation_keys`, `lean_target`, `adopted_value` (optional), `notes`.

## Commands

```bash
# From repo root
python formalization/scripts/check_ir.py
python formalization/scripts/diff_code_literals.py
```

Exit code 0 = IR complete for all `THM`/`DEF` rows that declare `lean_target` or `code_refs`; non-zero lists gaps.

## Backends

| Backend | Role |
|---------|------|
| Lean `lake build` | Symbolic / proof gate for `THM` |
| Wolfram log | Numeric oracle (`PHYSICS_EQUATION_VERIFICATION.md`) |
| Pytest science gates | Empirical falsifiers |
