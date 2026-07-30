#!/usr/bin/env bash
# Ship the already-built ./release artifacts as a GitHub Release.
#
# Preconditions: `npm run build` has produced release/parallel-code_<v>_amd64.deb,
# release/Parallel Code-<v>.AppImage and release/latest-linux.yml for the version
# currently in package.json. This script does not build — it ships what's there.
#
# Idempotent: if a release for the current version already exists, it exits
# without re-creating or re-uploading anything.
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(node -p "require('./package.json').version")
tag="v${version}"
repo_slug=$(git remote get-url origin | sed -E 's#.*[:/]([^/]+/[^/]+)\.git$#\1#')

deb="release/parallel-code_${version}_amd64.deb"
appimage_src="release/Parallel Code-${version}.AppImage"
yml="release/latest-linux.yml"

for f in "$deb" "$appimage_src" "$yml"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing build artifact: $f" >&2
    echo "Run 'npm run build' first, then re-run this script." >&2
    exit 1
  fi
done

yml_version=$(grep -m1 '^version:' "$yml" | awk '{print $2}')
if [[ "$yml_version" != "$version" ]]; then
  echo "release/latest-linux.yml is for version $yml_version but package.json is $version — stale build dir." >&2
  echo "Run 'npm run build' to refresh ./release before shipping." >&2
  exit 1
fi

if gh release view "$tag" --repo "$repo_slug" >/dev/null 2>&1; then
  echo "Release $tag already exists: https://github.com/${repo_slug}/releases/tag/${tag}"
  exit 0
fi

if ! git rev-parse "$tag" >/dev/null 2>&1; then
  git tag -a "$tag" -m "$tag"
  git push origin "$tag"
else
  git push origin "$tag" 2>/dev/null || true
fi

prev_tag=$(git tag -l 'v*' --sort=-v:refname | grep -v "^${tag}$" | head -1 || true)
if [[ -n "$prev_tag" ]]; then
  notes=$(git log --pretty=format:'- %s (%h)' "${prev_tag}..${tag}" -- . ':!release')
else
  notes=$(git log --pretty=format:'- %s (%h)' "$tag" -- . ':!release')
fi

# electron-builder's own artifact filenames use hyphens (matches latest-linux.yml's
# `url:` entries); the on-disk build output keeps the space from productName.
work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
appimage_asset="${work_dir}/Parallel-Code-${version}.AppImage"
cp "$appimage_src" "$appimage_asset"

gh release create "$tag" \
  --repo "$repo_slug" \
  --title "$tag" \
  --notes "$notes" \
  "$appimage_asset" \
  "$deb" \
  "$yml"

echo "Shipped: https://github.com/${repo_slug}/releases/tag/${tag}"
