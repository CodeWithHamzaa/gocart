#!/usr/bin/env bash
# M54: prove a database backup restores. Restores the dump into a SCRATCH database (never the live
# one), checks that the schema and the key tables came back, and drops the scratch database again.
#
#   scripts/backup-verify.sh <env-file> <dump-file>
#
# <dump-file> is gocart-db-*.dump or the encrypted gocart-db-*.dump.gpg (then BACKUP_PASSPHRASE_FILE
# is required). Needs the postgres service to be running. It is read-only for the live database.
# BACKUP_DIRECT=1 is for tests only (see backup.sh). To restore for real: docs/DEPLOYMENT.md.
set -euo pipefail

ENV_FILE="${1:?usage: backup-verify.sh <env-file> <dump-file>}"
DUMP="${2:?usage: backup-verify.sh <env-file> <dump-file>}"
fail() { printf 'backup-verify: %s\n' "$1" >&2; exit 1; }
[ -f "$ENV_FILE" ] || fail "env file not found: $ENV_FILE"
[ -s "$DUMP" ] || fail "dump not found or empty: $DUMP"

env_value() { local v; v="$(grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"; v="${v%\"}"; v="${v#\"}"; printf '%s' "${v:-$2}"; }
PGUSER_NAME="$(env_value POSTGRES_USER gocart)"
LIVE_DB="$(env_value POSTGRES_DB gocart)"
SCRATCH="gocart_verify_$(date -u +%s)_$$"

if [ "${BACKUP_DIRECT:-}" = "1" ]; then
  pg_run() { "$@"; }
else
  PROD=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)
  pg_run() { "${PROD[@]}" exec -T postgres "$@"; }
fi

dump_stream() {
  case "$DUMP" in
    *.gpg)
      [ -s "${BACKUP_PASSPHRASE_FILE:-}" ] || fail "an encrypted dump needs BACKUP_PASSPHRASE_FILE"
      gpg --batch --quiet --pinentry-mode loopback --decrypt --passphrase-file "$BACKUP_PASSPHRASE_FILE" <"$DUMP" ;;
    *) cat "$DUMP" ;;
  esac
}
sql() { pg_run psql -U "$PGUSER_NAME" -d "$SCRATCH" -tA -c "$1"; }

pg_run createdb -U "$PGUSER_NAME" "$SCRATCH"
trap 'pg_run dropdb -U "$PGUSER_NAME" --if-exists "$SCRATCH" >/dev/null 2>&1 || true' EXIT

# --no-privileges: the restricted gocart_app role does not exist in a fresh stack until the migrate
# step creates it (scripts/db-roles.ts); grants are re-applied there, not by the restore.
dump_stream | pg_run pg_restore -U "$PGUSER_NAME" -d "$SCRATCH" --no-owner --no-privileges --exit-on-error \
  || fail "pg_restore failed"

tables="$(sql "select count(*) from information_schema.tables where table_schema='public'")"
[ "${tables:-0}" -gt 0 ] || fail "the restored database has no tables"
for t in payload_migrations users products categories orders; do
  n="$(sql "select count(*) from \"$t\"")" || fail "table '$t' is missing or unreadable after restore"
  printf '  %-20s %s rows\n' "$t" "$n"
done
[ "$(sql "select count(*) from payload_migrations")" -gt 0 ] || fail "payload_migrations is empty"
printf 'backup-verify ok: %s restored into a scratch database (%s tables), scratch dropped. Live database "%s" untouched.\n' "$(basename "$DUMP")" "$tables" "$LIVE_DB"
