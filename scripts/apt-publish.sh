#!/usr/bin/env bash
#
# Publish .deb packages to the Sanctuaire Agentique apt repository on Cloudflare R2.
#
#   bash scripts/apt-publish.sh release/*.deb
#
# The repository is multi-application: the existing pool is pulled down first, so
# packages published by other projects stay in the index. Adding a new app means
# pointing this script at its .deb, nothing else.
#
# Requires R2 S3 credentials in the environment (or ~/.config/sanctuaire-apt.env):
#   export R2_ACCESS_KEY_ID=...
#   export R2_SECRET_ACCESS_KEY=...
#
# Client install line produced by this repo:
#   curl -fsSL https://apt.sanctuaireagentique.com/sanctuaire-agentique.gpg \
#     | sudo tee /usr/share/keyrings/sanctuaire-agentique.gpg >/dev/null
#   echo "deb [signed-by=/usr/share/keyrings/sanctuaire-agentique.gpg] \
#     https://apt.sanctuaireagentique.com stable main" \
#     | sudo tee /etc/apt/sources.list.d/sanctuaire-agentique.list
#
set -euo pipefail

ACCOUNT_ID=d73d92b3a053967dd551f67aac435cd9
BUCKET=apt
ENDPOINT="https://${ACCOUNT_ID}.r2.cloudflarestorage.com"
SUITE=stable
COMPONENT=main
ARCH=amd64
SIGN_KEY=43AEC70665D2B71FC9B53C7DB936F575CFCBE635
WORK="${APT_REPO_WORKDIR:-$HOME/.cache/sanctuaire-apt}"

env_file="$HOME/.config/sanctuaire-apt.env"
[ -f "$env_file" ] && . "$env_file"

if [ $# -eq 0 ]; then
  echo "usage: $0 <package.deb> [package.deb ...]" >&2
  exit 2
fi

for var in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "error: $var is not set (see the header of this script)" >&2
    exit 1
  fi
done

if ! gpg --list-secret-keys "$SIGN_KEY" >/dev/null 2>&1; then
  echo "error: signing key $SIGN_KEY is not in this machine's gpg keyring" >&2
  exit 1
fi

for deb in "$@"; do
  [ -f "$deb" ] || { echo "error: no such file: $deb" >&2; exit 1; }
done

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION=auto
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
s3() { aws s3 --endpoint-url "$ENDPOINT" "$@"; }

pool="$WORK/pool/$COMPONENT"
dist="$WORK/dists/$SUITE"
mkdir -p "$pool" "$dist/$COMPONENT/binary-$ARCH"

echo "==> pulling existing pool from r2://$BUCKET"
s3 sync "s3://$BUCKET/pool" "$WORK/pool"

echo "==> staging $# package(s)"
for deb in "$@"; do
  cp -f "$deb" "$pool/$(basename "$deb")"
done

echo "==> generating indices"
( cd "$WORK" && apt-ftparchive packages pool > "$dist/$COMPONENT/binary-$ARCH/Packages" )
gzip -9fkn "$dist/$COMPONENT/binary-$ARCH/Packages"

( cd "$WORK" && apt-ftparchive \
    -o APT::FTPArchive::Release::Origin="Sanctuaire Agentique" \
    -o APT::FTPArchive::Release::Label="Sanctuaire Agentique" \
    -o APT::FTPArchive::Release::Suite="$SUITE" \
    -o APT::FTPArchive::Release::Codename="$SUITE" \
    -o APT::FTPArchive::Release::Architectures="$ARCH" \
    -o APT::FTPArchive::Release::Components="$COMPONENT" \
    release "dists/$SUITE" > "$dist/Release.tmp" )
mv "$dist/Release.tmp" "$dist/Release"

echo "==> signing"
rm -f "$dist/Release.gpg" "$dist/InRelease"
gpg --batch --yes --local-user "$SIGN_KEY" --armor --detach-sign -o "$dist/Release.gpg" "$dist/Release"
gpg --batch --yes --local-user "$SIGN_KEY" --clearsign -o "$dist/InRelease" "$dist/Release"
gpg --export "$SIGN_KEY" > "$WORK/sanctuaire-agentique.gpg"

echo "==> uploading"
s3 sync "$WORK/pool" "s3://$BUCKET/pool" --content-type application/vnd.debian.binary-package
s3 cp "$WORK/sanctuaire-agentique.gpg" "s3://$BUCKET/sanctuaire-agentique.gpg" --content-type application/pgp-keys
# Indices last, so clients never read a Release that points at packages not yet uploaded.
s3 sync "$WORK/dists" "s3://$BUCKET/dists" --delete --content-type text/plain --cache-control "no-cache"

echo "==> published to https://apt.sanctuaireagentique.com ($SUITE/$COMPONENT)"
