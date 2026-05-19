# Release Evidence Pack (v0.3.6-beta)

## Runtime Parity Evidence
- Unified Theory route tested at `http://localhost:3000/unified-theory`.
- Successful simulation run confirmed with `POST /api/unified/bubble-lattice` status `200`.
- UI state transition observed: controls lock during calculation and re-enable on completion; export/save actions enabled after run.

## Contract Evidence
- Theory pipeline responses include `contract_version: v0.3.6-beta-science-gate-1`.
- Unified simulate responses include:
  - `contract_version`
  - `validation.route_mode`
  - `analytics_transparency.electrolyte_family`
  - `analytics_transparency.electrolyte_species`
  - `analytics_transparency.electrolyte_diagnostics`
  - `observables_bridge`
- Bubble-lattice responses include bounded electrolyte flags:
  - `regime_validity_flags`
  - `unsupported_extrapolation_flags`
  - `electrolyte_diagnostics`
  - `validation.contradiction_reason_code`
  - `dimensionless_parameters` (Ha, Rm, wall regime notes for UI transparency)
  - `transmutation_validation` (embedded Parkhomov-style subset; not the full external database)
- Unified simulate responses additionally include:
  - `transmutation_validation` (same schema as bubble-lattice)
- Theory-pipeline responses include composition provenance:
  - `composition_provenance.combination_rule`
  - `composition_provenance.applied_groups`
  - `composition_provenance.excluded_theories`

## Reproducible Contradiction Traces
- **Non-contradictory reference trace**
  - Endpoint: `POST /api/unified/bubble-lattice`
  - Expectation: `validation.contradiction=false`, `validation.contradiction_reason_code=none`
  - Condition: peak enhancement at/near cap still yields `proton_phases.NUCLEAR > 0`
- **Contradictory-classified trace**
  - Endpoint: `POST /api/unified/bubble-lattice`
  - Expectation: contradiction reason from taxonomy (`threshold_boundary`, `missing_phase_data`, `inconsistent_mode`) when applicable
  - Contract requirement: reason code always present, machine-readable

## Security and CI Evidence
- Frontend gate: `npm audit --audit-level=high` retained as blocker for high/critical vulnerabilities.
- Backend gate added: `pip-audit -r requirements.txt`.
- Workflow includes explicit least-privilege permissions (`contents: read`).

## Code Hygiene (v0.3.6-beta)

- Removed unmounted legacy routers and duplicate frontend registry stubs where they caused resolution ambiguity.
- Centralized API URL handling in `frontend/src/config/api.js` and proxy target override `REACT_APP_BACKEND_PROXY_TARGET`.

## Residual Risk Statement
- CRA remains the selected build tool for v0.3.6-beta. Moderate/low advisories may remain in transitive dev-tool dependencies.
- Advanced electrochemistry (full speciation and transport) is out of scope for this beta and remains deferred.
- Legacy/experimental websocket consumers still require long-term convergence, but base URL and connection generation are now centralized.
