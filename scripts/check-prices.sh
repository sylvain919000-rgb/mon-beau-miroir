#!/usr/bin/env bash
# Fails if a price literal appears anywhere outside lib/billing/products.ts.
# One pricing source means a price change can never be half-applied.
# Two patterns:
#   [€$][0-9] — a currency sign glued to an amount (e.g. "$2.00")
#   €         — the old currency must not reappear anywhere at all
set -euo pipefail
matches=$(grep -rnE "[€$][0-9]|€" app components lib --include='*.tsx' --include='*.ts' | grep -v "lib/billing/products.ts" || true)
if [ -n "$matches" ]; then
  echo "Price literals found outside lib/billing/products.ts:"
  echo "$matches"
  exit 1
fi
echo "Price check passed: price literals appear only in lib/billing/products.ts."
