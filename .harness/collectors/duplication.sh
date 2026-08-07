#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# duplication.sh — jscpd (multi-stack, via npx)
# Contrato: imprime no stdout {"duplication_pct": <number>}.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

rm -rf .jscpd-report
npx -y jscpd --silent --reporters json --output .jscpd-report src >/dev/null 2>&1 || true

if [ ! -f ".jscpd-report/jscpd-report.json" ]; then
  echo "STUB: jscpd-report.json não gerado" >&2
  echo '{"duplication_pct": null}'
  exit 0
fi

PCT=$(node -e "console.log(require('./.jscpd-report/jscpd-report.json').statistics.total.percentage || 0)")
rm -rf .jscpd-report
echo "{\"duplication_pct\": ${PCT:-0}}"
