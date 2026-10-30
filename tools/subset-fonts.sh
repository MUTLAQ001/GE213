#!/usr/bin/env bash
# Rebuilds the self-hosted fonts as small subsets (Arabic block + basic Latin).
# Needs fonttools with brotli:  pip install fonttools brotli
# Usage: tools/subset-fonts.sh <folder with the full woff2 files from Google Fonts>
# Keep the unicode ranges below identical to the unicode-range lines in assets/css/base.css,
# then bump VERSION in sw.js so returning visitors get the new files.
set -euo pipefail
SRC="${1:?folder with the original woff2 files}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/fonts"
ARABIC="U+0600-06FF,U+200C-200F,U+2066-2069,U+FB50-FDFF,U+FE70-FEFF"
LATIN="U+0020-007E,U+00A0,U+00AB,U+00B7,U+00BB,U+00D7,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+2190-2193,U+2212,U+2264-2265,U+2713"
for f in alexandria ibm-plex-sans-arabic-400 ibm-plex-sans-arabic-700; do
  pyftsubset "$SRC/$f-arabic.woff2" --unicodes="$ARABIC" --layout-features='*' --flavor=woff2 --output-file="$OUT/$f-arabic.woff2"
  pyftsubset "$SRC/$f-latin.woff2" --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file="$OUT/$f-latin.woff2"
done
du -cb "$OUT"/*.woff2 | tail -1
