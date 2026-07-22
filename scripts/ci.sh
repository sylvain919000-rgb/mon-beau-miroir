#!/usr/bin/env bash
# The full pre-merge gate. Run: npm run ci
set -euo pipefail
bash scripts/check-tokens.sh
bash scripts/check-prices.sh
npm run lint
npm run build
echo ""
echo "CI passed. (Playwright mission flow: npm run test:e2e — needs local browsers.)"
