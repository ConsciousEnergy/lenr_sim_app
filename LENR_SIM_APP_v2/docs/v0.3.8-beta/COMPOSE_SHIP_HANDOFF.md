# Operator: ship tip of main to Compose share (post #196/#197)

Cloud agents cannot `workflow_dispatch` Build and Deploy (HTTP 403) and have no
VPS SSH key. After squash-merging science/infra PRs to `main`, an operator must:

```bash
# From a machine with deploy rights:
gh workflow run "Build and Deploy" --ref main
# or SSH + BUILD_LOCALLY / IMAGE_TAG deploy via infrastructure/vps/scripts/deploy.sh

EXPECT_VERSION="$(grep -oP 'APP_VERSION: str = "\K[^"]+' LENR_SIM_APP_v2/backend/app/core/config.py)" \
  ./LENR_SIM_APP_v2/infrastructure/vps/scripts/verify-beta-share.sh
```

#196 (KM auto) and #197 (infra prep) landed on `main` 2026-09-16. Until the
operator ship runs, live share may still report `0.3.7-beta`.
