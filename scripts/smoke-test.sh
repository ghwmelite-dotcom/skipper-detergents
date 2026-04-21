#!/usr/bin/env bash
# Smoke-test the Skipper public read API against a deployed worker.
# Usage: BASE_URL=https://skipper-api.ghwmelite.workers.dev ./scripts/smoke-test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://skipper-api.ghwmelite.workers.dev}"
pass=0
fail=0

check() {
  local name="$1"
  local expected_status="$2"
  local url="$3"
  local extra_grep="${4:-}"
  local actual
  actual=$(curl -s -o /tmp/smoke-body -w '%{http_code}' "$url")
  if [ "$actual" != "$expected_status" ]; then
    echo "FAIL  $name — expected $expected_status, got $actual (URL: $url)"
    fail=$((fail + 1))
    return
  fi
  if [ -n "$extra_grep" ] && ! grep -q "$extra_grep" /tmp/smoke-body; then
    echo "FAIL  $name — body did not contain: $extra_grep"
    fail=$((fail + 1))
    return
  fi
  echo "PASS  $name"
  pass=$((pass + 1))
}

check "GET /health"                200 "$BASE_URL/health"                '"status":"ok"'
check "GET /api/products"          200 "$BASE_URL/api/products"          '"success":true'
check "GET /api/products/featured" 200 "$BASE_URL/api/products/featured" '"success":true'
check "GET /api/products/search"   200 "$BASE_URL/api/products/search?q=skip" '"success":true'
check "GET /api/products/:slug"    200 "$BASE_URL/api/products/skipper-liquid-detergent-2l" 'Skipper Liquid Detergent 2L'
check "GET /api/products/unknown"  404 "$BASE_URL/api/products/does-not-exist"
check "GET /api/categories"        200 "$BASE_URL/api/categories"        'detergents-laundry'
check "GET /api/categories/:slug/products" 200 "$BASE_URL/api/categories/detergents-laundry/products" '"success":true'
check "GET /api/settings/public"   200 "$BASE_URL/api/settings/public"   'Skipper Detergents'
check "GET /api/sitemap.xml"       200 "$BASE_URL/api/sitemap.xml"       '<urlset'
check "GET /api/products validation" 400 "$BASE_URL/api/products?per_page=9999"

echo "---"
echo "PASS: $pass   FAIL: $fail"
[ "$fail" -eq 0 ]
