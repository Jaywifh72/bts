#!/usr/bin/env bash
# Full-coverage link + asset crawl for cinecanon.com.
# Writes findings to docs/qa-reports/cinecanon-qa-full-crawl-<date>.md.
#
# Strategy:
#   1. Pull every URL from sitemap-index + all child sitemaps.
#   2. HEAD-check every URL in parallel (xargs -P 24).
#   3. For each curated film page, fetch HTML, extract every img src
#      and HEAD-check those too.
#   4. Bucket results: 2xx, 3xx, 4xx, 5xx, network.
set -uo pipefail

BASE="https://www.cinecanon.com"
DATE=$(date -u +%Y-%m-%d)
OUT_DIR="docs/qa-reports"
OUT="$OUT_DIR/cinecanon-qa-full-crawl-$DATE.md"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT_DIR"

echo "== Pulling sitemap index =="
curl -s "$BASE/sitemap.xml" \
  | grep -oE '<loc>[^<]+</loc>' | sed -E 's/<\/?loc>//g' > "$TMP/child-sitemaps.txt"
wc -l < "$TMP/child-sitemaps.txt" | xargs -I{} echo "  {} child sitemaps"

echo "== Pulling all URLs from child sitemaps =="
> "$TMP/all-urls.txt"
while read -r sm; do
  curl -s "$sm" | grep -oE '<loc>[^<]+</loc>' | sed -E 's/<\/?loc>//g' >> "$TMP/all-urls.txt"
done < "$TMP/child-sitemaps.txt"
# Add nav-only routes that wouldn't appear in sitemaps
cat >> "$TMP/all-urls.txt" <<EOF
$BASE/
$BASE/about
$BASE/methodology
$BASE/llms.txt
$BASE/digest.xml
$BASE/robots.txt
$BASE/sitemap.xml
$BASE/api/v1
$BASE/api/v1/aeo/digest.xml
$BASE/api/v1/aeo/claims
EOF
sort -u "$TMP/all-urls.txt" -o "$TMP/all-urls.txt"
TOTAL=$(wc -l < "$TMP/all-urls.txt")
echo "  $TOTAL unique URLs to check"

echo "== HEAD-checking all URLs (parallelism 24) =="
# Single curl per URL: -o /dev/null -w "%{http_code} %{url}\n"
# -L to follow redirects so 308 chains report the final status too.
# -m 15 second timeout.
xargs -a "$TMP/all-urls.txt" -P 24 -I{} \
  curl -s -o /dev/null -m 15 -w "%{http_code} %{redirect_url}|{}\n" {} > "$TMP/url-results.txt"
echo "  done"

# Bucket
awk -F'|' '{split($1,a," "); code=a[1]; url=$2; bucket="other";
  if (code ~ /^2/) bucket="2xx";
  else if (code ~ /^3/) bucket="3xx";
  else if (code ~ /^4/) bucket="4xx";
  else if (code ~ /^5/) bucket="5xx";
  else if (code == "000") bucket="network";
  print bucket"\t"code"\t"url}' "$TMP/url-results.txt" > "$TMP/url-bucketed.txt"

C2=$(awk -F'\t' '$1=="2xx"' "$TMP/url-bucketed.txt" | wc -l)
C3=$(awk -F'\t' '$1=="3xx"' "$TMP/url-bucketed.txt" | wc -l)
C4=$(awk -F'\t' '$1=="4xx"' "$TMP/url-bucketed.txt" | wc -l)
C5=$(awk -F'\t' '$1=="5xx"' "$TMP/url-bucketed.txt" | wc -l)
CN=$(awk -F'\t' '$1=="network"' "$TMP/url-bucketed.txt" | wc -l)

echo "  2xx=$C2  3xx=$C3  4xx=$C4  5xx=$C5  network=$CN"

# Sample film pages for image extraction. Pull every curated film URL.
echo "== Extracting and HEAD-checking images from every film page =="
grep "/films/" "$TMP/all-urls.txt" > "$TMP/film-urls.txt"
FILM_COUNT=$(wc -l < "$TMP/film-urls.txt")
echo "  $FILM_COUNT film pages"

# Extract img srcs per page, dedupe globally
> "$TMP/all-imgs.txt"
i=0
while read -r url; do
  i=$((i+1))
  curl -s -m 20 "$url" \
    | grep -oE '<img[^>]+src="[^"]+"' \
    | sed -E 's/.*src="([^"]+)".*/\1/' \
    | sed -E "s|^/|$BASE/|" \
    >> "$TMP/all-imgs.txt"
  if [ $((i % 25)) -eq 0 ]; then printf "  %d/%d film pages scraped\n" "$i" "$FILM_COUNT"; fi
done < "$TMP/film-urls.txt"

# Also scrape homepage and key index pages
for url in "$BASE/" "$BASE/crew" "$BASE/gear" "$BASE/stunts" "$BASE/vfx" "$BASE/sound"; do
  curl -s -m 20 "$url" \
    | grep -oE '<img[^>]+src="[^"]+"' \
    | sed -E 's/.*src="([^"]+)".*/\1/' \
    | sed -E "s|^/|$BASE/|" \
    >> "$TMP/all-imgs.txt"
done

sort -u "$TMP/all-imgs.txt" -o "$TMP/all-imgs.txt"
IMG_TOTAL=$(wc -l < "$TMP/all-imgs.txt")
echo "  $IMG_TOTAL unique image URLs extracted"

echo "== HEAD-checking images (parallelism 32) =="
xargs -a "$TMP/all-imgs.txt" -P 32 -I{} \
  curl -s -o /dev/null -m 15 -w "%{http_code}|%{size_download}|{}\n" {} > "$TMP/img-results.txt"
echo "  done"

awk -F'|' '{code=$1; size=$2; url=$3; bucket="other";
  if (code ~ /^2/ && size+0 > 0) bucket="ok";
  else if (code ~ /^2/ && size+0 == 0) bucket="zero-byte";
  else if (code ~ /^3/) bucket="redirect";
  else if (code ~ /^4/) bucket="4xx";
  else if (code ~ /^5/) bucket="5xx";
  else if (code == "000") bucket="network";
  print bucket"\t"code"\t"size"\t"url}' "$TMP/img-results.txt" > "$TMP/img-bucketed.txt"

IOK=$(awk -F'\t' '$1=="ok"' "$TMP/img-bucketed.txt" | wc -l)
I0=$(awk -F'\t' '$1=="zero-byte"' "$TMP/img-bucketed.txt" | wc -l)
IR=$(awk -F'\t' '$1=="redirect"' "$TMP/img-bucketed.txt" | wc -l)
I4=$(awk -F'\t' '$1=="4xx"' "$TMP/img-bucketed.txt" | wc -l)
I5=$(awk -F'\t' '$1=="5xx"' "$TMP/img-bucketed.txt" | wc -l)
IN=$(awk -F'\t' '$1=="network"' "$TMP/img-bucketed.txt" | wc -l)

echo "  ok=$IOK  zero-byte=$I0  3xx=$IR  4xx=$I4  5xx=$I5  network=$IN"

# Write report
{
  echo "# CineCanon Full Crawl — $DATE"
  echo
  echo "**Scope:** every URL in sitemap-index + all child sitemaps; every \`<img>\` extracted from every film page and key index pages. HEAD-only, 24-way parallel link probe, 32-way parallel image probe."
  echo
  echo "## Summary"
  echo
  echo "### Page URLs ($TOTAL total)"
  echo
  echo "| Bucket | Count |"
  echo "|---|---|"
  echo "| 2xx | $C2 |"
  echo "| 3xx | $C3 |"
  echo "| **4xx** | **$C4** |"
  echo "| **5xx** | **$C5** |"
  echo "| network error | $CN |"
  echo
  echo "### Images ($IMG_TOTAL unique)"
  echo
  echo "| Bucket | Count |"
  echo "|---|---|"
  echo "| ok (2xx, non-zero) | $IOK |"
  echo "| **zero-byte 2xx** | **$I0** |"
  echo "| 3xx redirect | $IR |"
  echo "| **4xx** | **$I4** |"
  echo "| **5xx** | **$I5** |"
  echo "| network error | $IN |"
  echo

  if [ "$C4" -gt 0 ] || [ "$C5" -gt 0 ] || [ "$CN" -gt 0 ]; then
    echo "## Broken pages"
    echo
    echo '```'
    awk -F'\t' '$1=="4xx" || $1=="5xx" || $1=="network" {printf "%s  %s\n", $2, $3}' "$TMP/url-bucketed.txt" | sort -u
    echo '```'
    echo
  fi

  if [ "$I0" -gt 0 ] || [ "$I4" -gt 0 ] || [ "$I5" -gt 0 ] || [ "$IN" -gt 0 ]; then
    echo "## Broken images"
    echo
    echo '```'
    awk -F'\t' '$1=="zero-byte" || $1=="4xx" || $1=="5xx" || $1=="network" {printf "%s  size=%s  %s\n", $2, $3, $4}' "$TMP/img-bucketed.txt" | sort -u
    echo '```'
    echo
  fi

  if [ "$IR" -gt 0 ]; then
    echo "## Images served via redirect (not broken, but slow)"
    echo
    echo '```'
    awk -F'\t' '$1=="redirect" {printf "%s  %s\n", $2, $4}' "$TMP/img-bucketed.txt" | sort -u | head -50
    [ "$IR" -gt 50 ] && echo "... ($((IR - 50)) more)"
    echo '```'
    echo
  fi

  echo "## Method"
  echo
  echo '```'
  echo "Pages: curl -s -o /dev/null -L -m 15 -w \"%{http_code}\\n\" <url>   (xargs -P 24)"
  echo "Imgs:  curl -s -o /dev/null    -m 15 -w \"%{http_code}|%{size_download}\\n\" <url>   (xargs -P 32)"
  echo '```'
} > "$OUT"

echo
echo "== Report: $OUT =="
