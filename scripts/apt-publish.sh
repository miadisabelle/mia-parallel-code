#!/usr/bin/env bash
#
# Publish a .deb to the Sanctuaire Agentique apt repository.
#
#   bash scripts/apt-publish.sh <package.deb> [download-url]
#
# The repository lives at https://apt.sanctuaireagentique.com, a Cloudflare
# Worker (apt-sanctuaire) backed by the R2 bucket "apt". Only the indices are
# stored there. When a download-url is given the package itself stays where it
# already is — for this project, its GitHub release asset — and the Worker
# redirects pool requests to it, so a 139 MB .deb is never copied anywhere.
# Without a download-url the .deb is uploaded into the bucket, which the
# Worker request limit caps at 100 MB.
#
# The repository holds packages from several applications: existing entries are
# read back before each publish and preserved. Adding a new app means calling
# this script with that app's .deb.
#
# Publishing needs the bearer token in ~/.config/sanctuaire-apt.env:
#   export APT_PUBLISH_TOKEN=...
#
# Client install:
#   curl -fsSL https://apt.sanctuaireagentique.com/sanctuaire-agentique.gpg \
#     | sudo tee /usr/share/keyrings/sanctuaire-agentique.gpg >/dev/null
#   echo "deb [signed-by=/usr/share/keyrings/sanctuaire-agentique.gpg] https://apt.sanctuaireagentique.com stable main" \
#     | sudo tee /etc/apt/sources.list.d/sanctuaire-agentique.list
#
set -euo pipefail

BASE_URL=https://apt.sanctuaireagentique.com
SUITE=stable
COMPONENT=main
ARCH=amd64
SIGN_KEY=43AEC70665D2B71FC9B53C7DB936F575CFCBE635

env_file="$HOME/.config/sanctuaire-apt.env"
# shellcheck source=/dev/null
[ -f "$env_file" ] && . "$env_file"

deb=${1:-}
download_url=${2:-}

if [ -z "$deb" ]; then
  echo "usage: $0 <package.deb> [download-url]" >&2
  exit 2
fi
[ -f "$deb" ] || { echo "error: no such file: $deb" >&2; exit 1; }

if [ -z "${APT_PUBLISH_TOKEN:-}" ]; then
  echo "error: APT_PUBLISH_TOKEN is not set (see $env_file)" >&2
  exit 1
fi

gpg --list-secret-keys "$SIGN_KEY" >/dev/null 2>&1 || {
  echo "error: signing key $SIGN_KEY is not in this machine's gpg keyring" >&2
  exit 1
}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

put() { # put <local-file> <key> <content-type>
  curl -fsS -X PUT "$BASE_URL/$2" \
    -H "Authorization: Bearer $APT_PUBLISH_TOKEN" \
    -H "Content-Type: $3" \
    --data-binary "@$1" >/dev/null
}

fetch() { # fetch <key> <dest>; empty file if absent
  curl -fsS "$BASE_URL/$1" -o "$2" 2>/dev/null || : > "$2"
}

pkgfile=$(basename "$deb")
poolkey="pool/$COMPONENT/$pkgfile"

echo "==> describing $pkgfile"
mkdir -p "$work/scan/$COMPONENT"
cp "$deb" "$work/scan/$COMPONENT/"
( cd "$work" && apt-ftparchive packages scan ) \
  | sed "s#^Filename: scan/$COMPONENT/#Filename: pool/$COMPONENT/#" > "$work/new-stanza"

echo "==> merging with what is already published"
fetch "dists/$SUITE/$COMPONENT/binary-$ARCH/Packages" "$work/old-packages"
fetch "pool-map.json" "$work/old-map"

python3 - "$work/old-packages" "$work/new-stanza" "$work/Packages" <<'PY'
import sys

def stanzas(text):
    return [s for s in text.split("\n\n") if s.strip()]

def key(stanza):
    fields = dict(
        line.split(": ", 1)
        for line in stanza.splitlines()
        if line[:1] not in (" ", "\t") and ": " in line
    )
    return (fields.get("Package"), fields.get("Version"), fields.get("Architecture"))

old_path, new_path, out_path = sys.argv[1:4]
old = stanzas(open(old_path).read())
new = stanzas(open(new_path).read())

merged = {key(s): s for s in old}
for s in new:
    merged[key(s)] = s

with open(out_path, "w") as fh:
    fh.write("\n\n".join(merged[k] for k in sorted(merged, key=lambda k: tuple(map(str, k)))) + "\n")
print(f"   {len(merged)} package(s) in the index")
PY

python3 - "$work/old-map" "$work/pool-map.json" "$poolkey" "$download_url" <<'PY'
import json, sys
old_path, out_path, poolkey, url = sys.argv[1:5]
try:
    with open(old_path) as fh:
        mapping = json.load(fh)
except Exception:
    mapping = {}
if url:
    mapping[poolkey] = url
else:
    mapping.pop(poolkey, None)
with open(out_path, "w") as fh:
    json.dump(mapping, fh, indent=2, sort_keys=True)
PY

gzip -9fkn "$work/Packages"

echo "==> building signed release"
dists="$work/dists/$SUITE"
mkdir -p "$dists/$COMPONENT/binary-$ARCH"
cp "$work/Packages" "$work/Packages.gz" "$dists/$COMPONENT/binary-$ARCH/"
( cd "$work" && apt-ftparchive \
    -o APT::FTPArchive::Release::Origin="Sanctuaire Agentique" \
    -o APT::FTPArchive::Release::Label="Sanctuaire Agentique" \
    -o APT::FTPArchive::Release::Suite="$SUITE" \
    -o APT::FTPArchive::Release::Codename="$SUITE" \
    -o APT::FTPArchive::Release::Architectures="$ARCH" \
    -o APT::FTPArchive::Release::Components="$COMPONENT" \
    release "dists/$SUITE" > "$work/Release" )
cp "$work/Release" "$dists/Release"
gpg --batch --yes --local-user "$SIGN_KEY" --armor --detach-sign -o "$dists/Release.gpg" "$dists/Release"
gpg --batch --yes --local-user "$SIGN_KEY" --clearsign -o "$dists/InRelease" "$dists/Release"
gpg --export "$SIGN_KEY" > "$work/sanctuaire-agentique.gpg"

echo "==> uploading"
if [ -n "$download_url" ]; then
  echo "    pool entry -> $download_url"
else
  put "$deb" "$poolkey" application/vnd.debian.binary-package
fi
put "$work/pool-map.json" "pool-map.json" application/json
put "$work/sanctuaire-agentique.gpg" "sanctuaire-agentique.gpg" application/pgp-keys
# Indices last, so a client never reads a Release naming a package not yet reachable.
put "$dists/$COMPONENT/binary-$ARCH/Packages" "dists/$SUITE/$COMPONENT/binary-$ARCH/Packages" text/plain
put "$dists/$COMPONENT/binary-$ARCH/Packages.gz" "dists/$SUITE/$COMPONENT/binary-$ARCH/Packages.gz" application/gzip
put "$dists/Release" "dists/$SUITE/Release" text/plain
put "$dists/Release.gpg" "dists/$SUITE/Release.gpg" text/plain
put "$dists/InRelease" "dists/$SUITE/InRelease" text/plain

echo "==> published $pkgfile to $BASE_URL ($SUITE/$COMPONENT)"
