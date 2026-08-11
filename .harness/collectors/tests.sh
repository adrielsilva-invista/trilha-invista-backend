#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# tests.sh — Node/Jest
# Contrato: imprime no stdout {"test_failures": <number>} (testes/suites vermelhos).
# Gate absoluto: qualquer valor != 0 reprova o PR (ver compare-baseline.js).

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# jest --json escreve só o resultado JSON no stdout; --silent tira o ruído dos testes.
# jest sai != 0 quando há falha; não deixe o set -e matar o coletor.
OUT=$(npx jest --json --silent 2>/dev/null || true)

if [ -z "$OUT" ]; then
  echo "STUB: jest não produziu JSON — jest rodou?" >&2
  echo '{"test_failures": null}'
  exit 0
fi

# numFailedTests (testes) + numFailedTestSuites (suite que nem compila).
# success=false com ambos 0 => falha catastrófica; ainda conta como 1 vermelho.
printf '%s' "$OUT" | node -e '
let s = "";
process.stdin.on("data", d => s += d).on("end", () => {
  try {
    const r = JSON.parse(s);
    const n = (r.numFailedTests || 0) + (r.numFailedTestSuites || 0);
    process.stdout.write(JSON.stringify({ test_failures: r.success === false && n === 0 ? 1 : n }));
  } catch {
    process.stdout.write(JSON.stringify({ test_failures: null }));
  }
});'
