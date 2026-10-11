#!/usr/bin/env bash
# ADR-036: assertions against the REAL production compose stack (docker-compose.prod.yml: postgres ->
# migrate -> app), run by the `prod-stack` CI job after `up`. Everything is checked from the outside
# of the app: HTTP from inside the app container (no ports are published), SQL as the roles, and
# `docker inspect`. Usage: scripts/prod-stack-check.sh <env-file>   (the same file used for `up`).
# cloudflared is not part of this check (it needs a real tunnel token).
set -euo pipefail

ENV_FILE="${1:?usage: prod-stack-check.sh <env-file>}"
PROD=(docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml)
set -a; . "$ENV_FILE"; set +a

pass() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; exit 1; }

# Runs a JS snippet inside the app container (Node 22: global fetch, FormData, Blob).
app_js() { "${PROD[@]}" exec -T app node -e "$1"; }
http_status() { # method path [json-body]
  app_js "fetch('http://127.0.0.1:3000$2',{method:'$1',redirect:'manual',headers:{'content-type':'application/json'}$( [ -n "${3:-}" ] && printf ",body:'%s'" "$3" )}).then(r=>console.log(r.status))"
}
psql_as() { # user password sql
  "${PROD[@]}" exec -T -e PGPASSWORD="$2" postgres psql -h postgres -U "$1" -d "${POSTGRES_DB:-gocart}" -tA -c "$3"
}

# --- the stack is up and the migrate step succeeded ---------------------------------------------------
migrate_id="$("${PROD[@]}" ps -aq migrate)"
[ "$(docker inspect "$migrate_id" --format '{{.State.ExitCode}}')" = "0" ] || fail "migrate did not exit 0"
[ "$(docker inspect "$migrate_id" --format '{{.HostConfig.ReadonlyRootfs}}')" = "true" ] || fail "migrate root filesystem is writable"
pass "migrate exited 0 on a read-only root filesystem"
ready=""
for i in $(seq 1 60); do
  if [ "$(http_status GET / 2>/dev/null || true)" = "200" ]; then ready=1; break; fi
  sleep 2
done
[ -n "$ready" ] || fail "the app did not become ready within 120 s"
for path in / /shop /cart /orders /categories /admin /sitemap.xml /robots.txt; do
  [ "$(http_status GET "$path")" = "200" ] || fail "GET $path is not 200"
done
pass "storefront and /admin respond 200"

# --- B1: the image optimizer endpoint is closed -------------------------------------------------------
for path in "/_next/image" "/_next/image?url=%2Fapi%2Fmedia%2Ffile%2Fa.png&w=640&q=75"; do
  [ "$(http_status GET "$path")" = "404" ] || fail "GET $path is not 404"
done
pass "/_next/image is closed (404)"

# --- H4: separate database roles ---------------------------------------------------------------------
db_uri="$("${PROD[@]}" exec -T app printenv DATABASE_URI)"
case "$db_uri" in postgresql://gocart_app:*) ;; *) fail "the app does not connect as gocart_app" ;; esac
if "${PROD[@]}" exec -T app env | grep -Eq '^(POSTGRES_PASSWORD|ADMIN_BOOTSTRAP_|APP_DB_PASSWORD)='; then fail "the app container holds a secret it must not have"; fi
if "${PROD[@]}" exec -T app env | grep -Eq '^(PAYLOAD_ALLOW_FIRST_REGISTER|TURNSTILE_ALLOW_TEST_KEYS)=.'; then fail "the app environment carries a dev/CI-only flag"; fi
pass "the app connects as gocart_app and holds no superuser, bootstrap secret or dev/CI-only flag"
psql_as gocart_app "$APP_DB_PASSWORD" "select count(*) from orders" >/dev/null || fail "gocart_app cannot read orders"
for sql in "create table evil(x int)" "drop table orders" "alter table orders add column z int" "truncate orders" \
           "create role r2 superuser" "copy (select 1) to program 'id'" "delete from payload_migrations" "create schema s2"; do
  if psql_as gocart_app "$APP_DB_PASSWORD" "$sql" >/dev/null 2>&1; then fail "gocart_app was allowed: $sql"; fi
done
pass "gocart_app: row access only (DDL, role creation, COPY PROGRAM, migration tampering all refused)"

# --- M6: read-only root filesystem, unprivileged user -----------------------------------------------
app_id="$("${PROD[@]}" ps -q app)"
[ "$(docker inspect "$app_id" --format '{{.HostConfig.ReadonlyRootfs}}')" = "true" ] || fail "app root filesystem is writable"
[ "$("${PROD[@]}" exec -T app id -u)" = "1000" ] || fail "app does not run as uid 1000"
if "${PROD[@]}" exec -T app sh -c 'touch /app/should-not-exist' 2>/dev/null; then fail "app could write to /app"; fi
pass "app: read-only root filesystem, uid 1000"

# --- B2: the first-admin window is closed ------------------------------------------------------------
[ "$(app_js "fetch('http://127.0.0.1:3000/api/users/init').then(r=>r.json()).then(j=>console.log(j.initialized))")" = "true" ] || fail "no admin was created from the bootstrap secret"
pass "the first admin was created from the bootstrap secret"
# Empty the users table, as after a database wipe, and prove nobody can register through the open flow.
psql_as "${POSTGRES_USER:-gocart}" "$POSTGRES_PASSWORD" "truncate users cascade" >/dev/null
[ "$(app_js "fetch('http://127.0.0.1:3000/api/users/init').then(r=>r.json()).then(j=>console.log(j.initialized))")" = "false" ] || fail "users table not empty"
[ "$(http_status POST /api/users/first-register '{"email":"attacker@evil.test","password":"Attacker-Pass-12345!"}')" = "403" ] || fail "first-register is not refused on an EMPTY users table"
[ "$(http_status POST /api/users '{"email":"attacker@evil.test","password":"Attacker-Pass-12345!"}')" = "403" ] || fail "POST /api/users is not refused"
[ "$(psql_as "${POSTGRES_USER:-gocart}" "$POSTGRES_PASSWORD" "select count(*) from users")" = "0" ] || fail "a user was created"
pass "first-register and user creation refused with an empty users table (403), nothing created"

# --- B2 + M6: re-running the deploy step recreates the admin; uploads work and unsafe types are refused
"${PROD[@]}" run --rm -T migrate >/dev/null || fail "re-running migrate failed"
[ "$(app_js "fetch('http://127.0.0.1:3000/api/users/init').then(r=>r.json()).then(j=>console.log(j.initialized))")" = "true" ] || fail "re-running migrate did not recreate the admin"
pass "re-running migrate recreated the admin from the bootstrap secret (idempotent deploy)"
PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
AVIF='AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZg=='
run_upload() {
  "${PROD[@]}" exec -T -e E="$ADMIN_BOOTSTRAP_EMAIL" -e P="$ADMIN_BOOTSTRAP_PASSWORD" app node -e "
    (async () => {
      const base = 'http://127.0.0.1:3000';
      const login = await (await fetch(base + '/api/users/login', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({email: process.env.E, password: process.env.P})})).json();
      const fd = new FormData();
      fd.append('file', new Blob([Buffer.from('$3', 'base64')], {type: '$2'}), '$1');
      fd.append('_payload', JSON.stringify({alt: 'ci'}));
      const r = await fetch(base + '/api/media', {method:'POST', headers:{Authorization: 'JWT ' + login.token}, body: fd});
      const j = await r.json().catch(() => ({}));
      if (r.status === 201) { const f = await fetch(base + '/api/media/file/' + j.doc.filename); console.log(r.status + ' file:' + f.status); }
      else console.log(r.status);
    })()"
}
[ "$(run_upload ci.png image/png "$PNG")" = "201 file:200" ] || fail "a PNG upload (written to the media volume) or its download failed"
pass "PNG upload and download work on the read-only container (media volume)"
[ "$(run_upload ci.avif image/avif "$AVIF")" = "400" ] || fail "an AVIF upload was not refused"
[ "$(run_upload ci.svg image/svg+xml "$(printf '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>' | base64 -w0)")" = "400" ] || fail "an SVG upload was not refused"
pass "AVIF and SVG uploads are refused (400)"

# --- M54: backup, restore verification, and persistence across a full stop/start -----------------------
BK="$(mktemp -d)"; trap 'rm -rf "$BK"' EXIT
scripts/backup.sh "$ENV_FILE" "$BK" >/dev/null || fail "scripts/backup.sh failed"
ls "$BK"/gocart-db-*.dump >/dev/null 2>&1 || fail "backup.sh wrote no database dump"
tar tzf "$BK"/gocart-media-*.tar.gz | grep -q '\.png$' || fail "the media archive does not contain the uploaded PNG"
(cd "$BK" && sha256sum -c SHA256SUMS-* >/dev/null) || fail "backup checksums do not match"
scripts/backup-verify.sh "$ENV_FILE" "$BK"/gocart-db-*.dump >/dev/null || fail "the backup does not restore into a scratch database"
pass "backup.sh: dump + media archive + checksums; backup-verify.sh restored the dump into a scratch database"
# Stop everything WITHOUT removing volumes, start again: the admin (database) and the upload (media volume) survive.
"${PROD[@]}" down >/dev/null 2>&1 || fail "docker compose down failed"
"${PROD[@]}" up -d app >/dev/null 2>&1 || fail "docker compose up after down failed"
ready=""
for i in $(seq 1 60); do
  if [ "$(http_status GET / 2>/dev/null || true)" = "200" ]; then ready=1; break; fi
  sleep 2
done
[ -n "$ready" ] || fail "the app did not become ready after a full stop/start"
[ "$(app_js "fetch('http://127.0.0.1:3000/api/users/init').then(r=>r.json()).then(j=>console.log(j.initialized))")" = "true" ] || fail "the admin user did not survive stop/start"
[ "$(app_js "fetch('http://127.0.0.1:3000/api/media?limit=1').then(r=>r.json()).then(j=>fetch('http://127.0.0.1:3000/api/media/file/'+j.docs[0].filename)).then(r=>console.log(r.status))")" = "200" ] || fail "the uploaded media did not survive stop/start"
pass "full stop/start (volumes kept): database rows and uploaded media survive"

echo "prod-stack checks passed"
