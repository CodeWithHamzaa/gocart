#!/usr/bin/env bash
# M54: back up the production database and the uploaded-media volume (ADR-015: manual backups,
# ADR-020: media is a local volume). Usage:
#
#   scripts/backup.sh <env-file> <out-dir>
#
# <env-file> is the same file used for `docker compose --env-file`; only POSTGRES_USER and
# POSTGRES_DB are read from it (no secret is exported or printed). <out-dir> should be OUTSIDE the
# repository checkout. Writes, with mode 600 (the dump is customer personal data):
#
#   gocart-db-<UTC stamp>.dump[.gpg]        pg_dump custom format (compressed, pg_restore-able)
#   gocart-media-<UTC stamp>.tar.gz[.gpg]   the app-media volume
#   SHA256SUMS-<UTC stamp>                  checksums of the two files above
#
# Optional environment:
#   BACKUP_PASSPHRASE_FILE  file holding a passphrase; when set, both archives are encrypted with
#                           gpg (AES256, symmetric) and the plaintext copies are removed. Keep that
#                           file OFF the backup destination, or the encryption is pointless.
#   BACKUP_KEEP             how many backup sets to keep in <out-dir> (default 14, minimum 1)
#   BACKUP_PROJECT          compose project name (default gocart-prod); the media volume is
#                           <project>_app-media
#   BACKUP_DIRECT=1         TESTS ONLY: run pg_dump/pg_restore on this machine instead of inside the
#                           postgres container (PG* variables select the server), and BACKUP_MEDIA_DIR
#                           names a host directory to archive instead of the Docker volume.
#
# A backup that was never restored is not a backup: run scripts/backup-verify.sh on the dump.
set -euo pipefail
umask 077

ENV_FILE="${1:?usage: backup.sh <env-file> <out-dir>}"
OUT_DIR="${2:?usage: backup.sh <env-file> <out-dir>}"
KEEP="${BACKUP_KEEP:-14}"
PROJECT="${BACKUP_PROJECT:-gocart-prod}"
PASSFILE="${BACKUP_PASSPHRASE_FILE:-}"

fail() { printf 'backup: %s\n' "$1" >&2; exit 1; }
case "$KEEP" in ''|*[!0-9]*|0) fail "BACKUP_KEEP must be a whole number >= 1" ;; esac
[ -f "$ENV_FILE" ] || fail "env file not found: $ENV_FILE"
[ -z "$PASSFILE" ] || [ -s "$PASSFILE" ] || fail "BACKUP_PASSPHRASE_FILE is empty or missing"

env_value() { # name default; reads NAME=value without sourcing the file
  local v; v="$(grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
  v="${v%\"}"; v="${v#\"}"
  printf '%s' "${v:-$2}"
}
PGUSER_NAME="$(env_value POSTGRES_USER gocart)"
PGDB_NAME="$(env_value POSTGRES_DB gocart)"

if [ "${BACKUP_DIRECT:-}" = "1" ]; then
  pg_run() { "$@"; }
  media_tar() { tar czf - -C "${BACKUP_MEDIA_DIR:?BACKUP_MEDIA_DIR is required with BACKUP_DIRECT=1}" .; }
else
  PROD=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)
  pg_run() { "${PROD[@]}" exec -T postgres "$@"; }
  # Read-only mount, no network, same image as postgres (already pulled; busybox tar).
  media_tar() { docker run --rm --network none -v "${PROJECT}_app-media:/media:ro" --entrypoint tar postgres:17-alpine czf - -C /media .; }
fi

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_FILE="gocart-db-$STAMP.dump"
MEDIA_FILE="gocart-media-$STAMP.tar.gz"
cleanup() { rm -f "$OUT_DIR"/*.partial; }
trap cleanup EXIT

# 1. Database. Written to a .partial name so a crash never leaves something that looks complete.
pg_run pg_dump -U "$PGUSER_NAME" -d "$PGDB_NAME" -Fc >"$OUT_DIR/$DB_FILE.partial"
[ -s "$OUT_DIR/$DB_FILE.partial" ] || fail "the database dump is empty"
pg_run pg_restore --list <"$OUT_DIR/$DB_FILE.partial" >/dev/null || fail "the database dump cannot be read back (truncated?)"
mv "$OUT_DIR/$DB_FILE.partial" "$OUT_DIR/$DB_FILE"

# 2. Media.
media_tar >"$OUT_DIR/$MEDIA_FILE.partial"
tar tzf "$OUT_DIR/$MEDIA_FILE.partial" >/dev/null || fail "the media archive cannot be read back"
mv "$OUT_DIR/$MEDIA_FILE.partial" "$OUT_DIR/$MEDIA_FILE"

# 3. Optional encryption (the plaintext is removed once the encrypted copy exists).
FILES=("$DB_FILE" "$MEDIA_FILE")
if [ -n "$PASSFILE" ]; then
  for f in "${FILES[@]}"; do
    gpg --batch --yes --pinentry-mode loopback --symmetric --cipher-algo AES256 \
      --passphrase-file "$PASSFILE" -o "$OUT_DIR/$f.gpg" "$OUT_DIR/$f"
    rm -f "$OUT_DIR/$f"
  done
  FILES=("$DB_FILE.gpg" "$MEDIA_FILE.gpg")
fi

# 4. Checksums.
(cd "$OUT_DIR" && sha256sum "${FILES[@]}" >"SHA256SUMS-$STAMP")

# 5. Retention: keep the newest $KEEP sets, delete the rest (only files this script names).
ls -1 "$OUT_DIR" | grep -E '^gocart-db-[0-9]{8}T[0-9]{6}Z\.dump(\.gpg)?$' | sort | head -n "-$KEEP" | while read -r old; do
  s="${old#gocart-db-}"; s="${s%%.dump*}"
  rm -f "$OUT_DIR/gocart-db-$s.dump" "$OUT_DIR/gocart-db-$s.dump.gpg" \
        "$OUT_DIR/gocart-media-$s.tar.gz" "$OUT_DIR/gocart-media-$s.tar.gz.gpg" "$OUT_DIR/SHA256SUMS-$s"
done

printf 'backup ok: %s\n' "$STAMP"
for f in "${FILES[@]}"; do printf '  %s (%s bytes)\n' "$f" "$(stat -c %s "$OUT_DIR/$f")"; done
[ -n "$PASSFILE" ] || printf 'WARNING: not encrypted. Encrypt before this leaves the machine (BACKUP_PASSPHRASE_FILE).\n' >&2
