#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# coverage.sh — Node/Jest
# Contrato: imprime no stdout {"coverage_pct": <number>} (linhas cobertas).

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

npx jest --coverage --coverageReporters=json-summary --silent >/dev/null 2>&1 || true

if [ ! -f "coverage/coverage-summary.json" ]; then
  echo "STUB: coverage-summary.json não gerado — jest rodou?" >&2
  echo '{"coverage_pct": null}'
  exit 0
fi

PCT=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
echo "{\"coverage_pct\": ${PCT:-0}}"
