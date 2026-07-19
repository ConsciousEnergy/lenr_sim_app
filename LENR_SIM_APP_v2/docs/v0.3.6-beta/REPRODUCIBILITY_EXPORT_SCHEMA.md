# Reproducibility Export Schema v1

## JSON Envelope

```json
{
  "schema_version": "lenr-run-export-v1",
  "exported_at": "ISO-8601",
  "environment": "development|test|production",
  "simulation_parameters": {},
  "system_preset": "string",
  "results": {}
}
```

## Required Metadata
- `schema_version`
- `exported_at`
- `environment`
- full simulation parameters
- full run results object

## Notes
- `UnifiedTheoryPage` export now writes `schema_version` and `environment`.
- Follow-up enhancement: attach backend model hash and explicit random seed for all exports.

