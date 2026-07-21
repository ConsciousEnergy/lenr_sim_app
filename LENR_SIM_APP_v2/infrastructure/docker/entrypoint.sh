#!/bin/sh
set -e

# Read Docker secrets and export as environment variables
if [ -f /run/secrets/postgres_password ]; then
  export LENR_DB_PASSWORD=$(cat /run/secrets/postgres_password)
fi

if [ -f /run/secrets/api_secret_key ] && [ -z "$LENR_SECRET_KEY" ]; then
  export LENR_SECRET_KEY=$(cat /run/secrets/api_secret_key)
  export LENR_JWT_SECRET_KEY=$(cat /run/secrets/api_secret_key)
fi

exec "$@"
