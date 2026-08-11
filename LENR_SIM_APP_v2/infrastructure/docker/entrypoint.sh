#!/bin/sh
set -e

# Read a Docker Swarm secret file, strip CR/LF, and echo the value without
# word-splitting. Callers must quote the result when exporting.
_read_secret() {
  # tr strips trailing/embedded CR/LF from secret files written with a newline.
  tr -d '\r\n' < "$1"
}

# Postgres password — export both LENR_-prefixed (Pydantic Settings) and
# unprefixed DB_PASSWORD (get_database_url / legacy readers).
if [ -f /run/secrets/postgres_password ]; then
  _pw="$(_read_secret /run/secrets/postgres_password)"
  export LENR_DB_PASSWORD="$_pw"
  export DB_PASSWORD="$_pw"
fi

# API / JWT secret — only set when unset or empty (respect operator overrides).
if [ -f /run/secrets/api_secret_key ]; then
  _sk="$(_read_secret /run/secrets/api_secret_key)"
  if [ -z "${LENR_SECRET_KEY:-}" ]; then
    export LENR_SECRET_KEY="$_sk"
  fi
  if [ -z "${LENR_JWT_SECRET_KEY:-}" ]; then
    export LENR_JWT_SECRET_KEY="$_sk"
  fi
  if [ -z "${SECRET_KEY:-}" ]; then
    export SECRET_KEY="$_sk"
  fi
fi

exec "$@"
