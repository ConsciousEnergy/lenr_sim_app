# Remote Terraform state + staging workspace (prep)

**Do not apply to production.** This enables plan-only remote state for the
v0.3.8 cutover window.

## Backend

Root module accepts a partial S3-compatible backend (R2 or AWS S3):

```hcl
# infrastructure/terraform/main.tf
terraform {
  backend "s3" {}
}
```

Operator supplies backend settings via file (never commit secrets):

```bash
cp backend.hcl.example backend.hcl   # gitignored pattern: backend.hcl
# fill bucket / key / region / endpoint
terraform init -backend-config=backend.hcl
terraform workspace new staging     # once
terraform workspace select staging
terraform plan -var-file=staging.tfvars
```

Local-only validate remains available:

```bash
terraform init -backend=false
terraform validate
```

## Workspaces

| Workspace | Purpose | Apply? |
|-----------|---------|--------|
| `staging` | Non-prod plan / check-mode | Plan / staging apply under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` |
| `prod` | Public cutover (v0.3.9) | Blocked without `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` |

Default Hostinger mode in variables is `disabled` so a staging plan cannot
blindly create a VPS against live `185.211.4.66`. See
[DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md).
