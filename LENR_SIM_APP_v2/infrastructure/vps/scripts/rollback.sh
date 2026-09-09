#!/bin/bash
# Roll the running stack back to the previous IMAGE_TAG recorded by deploy.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAG_FILE=/opt/lenr-sim/.rollback-image-tag
REQUESTED="${1:-}"

if [[ -n "$REQUESTED" ]]; then
  TAG="$REQUESTED"
elif [[ -f "$TAG_FILE" ]]; then
  TAG="$(cat "$TAG_FILE")"
else
  echo "Usage: rollback.sh <image-tag>   (no previous tag recorded)" >&2
  exit 1
fi

echo "Rolling back to IMAGE_TAG=$TAG"
IMAGE_TAG="$TAG" BUILD_LOCALLY=0 exec "$SCRIPT_DIR/deploy.sh"
