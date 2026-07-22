#!/usr/bin/env bash
# Fails if any raw hex color exists outside app/globals.css.
# Keeping every style value in the token file is a hard project rule.
set -euo pipefail
matches=$(grep -rnE "#[0-9a-fA-F]{3,8}\b" app components lib --include='*.tsx' --include='*.ts' --include='*.css' | grep -v "app/globals.css" || true)
if [ -n "$matches" ]; then
  echo "Raw hex colors found outside app/globals.css:"
  echo "$matches"
  exit 1
fi
echo "Token check passed: no raw colors outside app/globals.css."
