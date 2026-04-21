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

# --- Milestone 2b: checkout API ---
order_payload='{"items":[{"product_id":"prod_skipper_2l","quantity":1}],"delivery_method":"pickup","delivery_name":"Smoke Tester","delivery_email":"smoke@example.com","delivery_phone":"+233200000000","payment_method":"paystack"}'

order_response=$(curl -s -X POST "$BASE_URL/api/orders" -H "Content-Type: application/json" -d "$order_payload")
order_id=$(echo "$order_response" | sed -n 's/.*"id":"\([a-f0-9]\{16\}\)".*/\1/p' | head -1)
order_number=$(echo "$order_response" | sed -n 's/.*"order_number":"\(SK-[0-9-]*\)".*/\1/p' | head -1)

if [ -n "$order_id" ] && [ -n "$order_number" ]; then
  echo "PASS  POST /api/orders (created $order_number)"
  pass=$((pass + 1))
else
  echo "FAIL  POST /api/orders (response: $order_response)"
  fail=$((fail + 1))
fi

if [ -n "$order_number" ]; then
  check "GET /api/track/:order_number"            200 "$BASE_URL/api/track/$order_number?email=smoke@example.com" "$order_number"
  check "GET /api/track 404 on wrong email"       404 "$BASE_URL/api/track/$order_number?email=other@example.com"
  check "GET /api/track 400 on missing email"     400 "$BASE_URL/api/track/$order_number"
fi

webhook_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/webhooks/paystack" -H "Content-Type: application/json" -d '{"event":"charge.success"}')
if [ "$webhook_status" = "401" ]; then
  echo "PASS  POST /webhooks/paystack rejects unsigned"
  pass=$((pass + 1))
else
  echo "FAIL  POST /webhooks/paystack expected 401 got $webhook_status"
  fail=$((fail + 1))
fi

echo "---"
echo "PASS: $pass   FAIL: $fail"
[ "$fail" -eq 0 ]
