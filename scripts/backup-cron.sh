#!/usr/bin/env bash
# M99 (a): the scheduled backup. A thin wrapper for cron around scripts/backup.sh and
# scripts/backup-verify.sh; it adds nothing to what they back up. Usage (from a crontab line, see
# docs/DEPLOYMENT.md, "Scheduled backups"):
#
#   BACKUP_PASSPHRASE_FILE=<file> scripts/backup-cron.sh <env-file> <out-dir>
#
# What cron does not give a script, this one sets up:
#   - the working directory: backup.sh finds docker-compose.prod.yml relative to the checkout, so
#     this cds to the checkout this script lives in;
#   - PATH: cron's is minimal, and docker, gpg and sha256sum must be found;
#   - no overlap: a run that starts while the previous one is still going exits 75 and says so
#     (flock on <out-dir>/.backup.lock);
#   - encryption is REQUIRED: an unattended dump of customer data must never sit in plaintext, so
#     BACKUP_PASSPHRASE_FILE must name a non-empty file (backup.sh then writes only .gpg files);
#   - proof: the newest dump is restored into a scratch database by backup-verify.sh after every
#     run (BACKUP_VERIFY=0 skips it, for example on a very large database);
#   - a marker: <out-dir>/LAST_OK holds the UTC time of the last run that backed up AND verified,
#     for a monitor or a quick `cat`.
# Every line it prints starts with a UTC timestamp, so the cron log reads on its own. Exit status is
# 0 only when the backup (and the verify, unless skipped) succeeded.
set -euo pipefail
umask 077
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:$PATH}"

ENV_FILE="${1:?usage: backup-cron.sh <env-file> <out-dir>}"
OUT_DIR="${2:?usage: backup-cron.sh <env-file> <out-dir>}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '%s backup-cron: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1"; }
fail() { log "FAILED: $1" >&2; exit 1; }

# Relative paths are resolved before the cd below.
case "$ENV_FILE" in /*) ;; *) ENV_FILE="$PWD/$ENV_FILE" ;; esac
case "$OUT_DIR" in /*) ;; *) OUT_DIR="$PWD/$OUT_DIR" ;; esac
[ -f "$ENV_FILE" ] || fail "env file not found: $ENV_FILE"
[ -n "${BACKUP_PASSPHRASE_FILE:-}" ] || fail "BACKUP_PASSPHRASE_FILE is not set; scheduled backups must be encrypted"
[ -s "$BACKUP_PASSPHRASE_FILE" ] || fail "BACKUP_PASSPHRASE_FILE is empty or missing: $BACKUP_PASSPHRASE_FILE"
command -v flock >/dev/null || fail "flock not found (package util-linux)"

mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
exec 9>"$OUT_DIR/.backup.lock"
if ! flock -n 9; then
  log "skipped: the previous backup is still running" >&2
  exit 75
fi

cd "$HERE/.."
log "starting (checkout $(pwd))"
if ! "$HERE/backup.sh" "$ENV_FILE" "$OUT_DIR" 2>&1 | while IFS= read -r line; do log "$line"; done; then
  fail "scripts/backup.sh exited non-zero"
fi

DUMP="$(ls -1 "$OUT_DIR" | grep -E '^gocart-db-[0-9]{8}T[0-9]{6}Z\.dump\.gpg$' | sort | tail -n1 || true)"
[ -n "$DUMP" ] || fail "backup.sh reported success but no encrypted dump is in $OUT_DIR"

if [ "${BACKUP_VERIFY:-1}" = "0" ]; then
  log "verify skipped (BACKUP_VERIFY=0): $DUMP"
else
  if ! "$HERE/backup-verify.sh" "$ENV_FILE" "$OUT_DIR/$DUMP" 2>&1 | while IFS= read -r line; do log "$line"; done; then
    fail "scripts/backup-verify.sh could not restore $DUMP"
  fi
fi

date -u +%Y-%m-%dT%H:%M:%SZ >"$OUT_DIR/LAST_OK"
log "ok: $DUMP"
