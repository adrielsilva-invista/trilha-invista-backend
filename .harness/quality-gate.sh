#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# quality-gate.sh — orquestrador do Quality Gate
#
# Modos:
#   ./.harness/quality-gate.sh                       -> compara métricas atuais vs baseline (exit 1 se piorou)
#   ./.harness/quality-gate.sh --generate-baseline   -> grava métricas atuais em plan-build/baseline.json

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COLLECTORS="$ROOT/.harness/collectors"
BASELINE="$ROOT/plan-build/baseline.json"
METRICS="/tmp/metrics.json"

GENERATE_MODE=false
if [ "${1:-}" = "--generate-baseline" ]; then
  GENERATE_MODE=true
fi

color_red()   { printf "\033[31m%s\033[0m\n" "$1"; }
color_green() { printf "\033[32m%s\033[0m\n" "$1"; }
color_yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

run_collector() {
  local name="$1"
  local script="$2"
  if [ ! -x "$script" ]; then
    color_yellow "  [skip] $name — coletor não encontrado ou sem permissão de execução"
    echo "{}"
    return
  fi
  local out
  # stderr do coletor flui direto pro terminal (avisos STUB, debug, erros).
  # Só capturamos stdout, que é o JSON contrato.
  if ! out=$("$script"); then
    color_yellow "  [warn] $name — coletor retornou erro, usando vazio"
    echo "{}"
    return
  fi
  echo "$out"
}

echo "==> Rodando coletores"

tst=$(run_collector "tests"        "$COLLECTORS/tests.sh")
cov=$(run_collector "coverage"     "$COLLECTORS/coverage.sh")
dup=$(run_collector "duplication"  "$COLLECTORS/duplication.sh")
lnt=$(run_collector "lint"         "$COLLECTORS/lint.sh")
sz=$(run_collector  "file-size"    "$COLLECTORS/file-size.sh")
cmp=$(run_collector "compliance"   "$COLLECTORS/compliance-grep.sh")

# Agrega tudo num único JSON. Usa node se disponível; senão concatenação simples.
if command -v node >/dev/null 2>&1; then
  # JSONs passam por argv (não por template-literal) — imune a backtick/${} vindo
  # dos matches do compliance-grep (ex.: kanban.mjs). Ver bug do merge do kanban.
  node -e '
const merge = (...objs) => Object.assign({}, ...objs.map(s => { try { return JSON.parse(s); } catch { return {}; } }));
const out = merge(...process.argv.slice(1));
out.generated_at = new Date().toISOString();
process.stdout.write(JSON.stringify(out, null, 2));
' "$tst" "$cov" "$dup" "$lnt" "$sz" "$cmp" > "$METRICS"
else
  # Fallback grosseiro sem node
  {
    echo "{"
    echo "  \"tests\":       $tst,"
    echo "  \"coverage\":    $cov,"
    echo "  \"duplication\": $dup,"
    echo "  \"lint\":        $lnt,"
    echo "  \"size\":        $sz,"
    echo "  \"compliance\":  $cmp,"
    echo "  \"generated_at\": \"$(date -u +%FT%TZ)\""
    echo "}"
  } > "$METRICS"
fi

echo "==> Métricas atuais:"
cat "$METRICS"
echo

if $GENERATE_MODE; then
  cp "$METRICS" "$BASELINE"
  color_green "Baseline atualizado: $BASELINE"
  exit 0
fi

if [ ! -f "$BASELINE" ]; then
  color_red "Baseline não encontrado em $BASELINE"
  echo "Rode: ./.harness/quality-gate.sh --generate-baseline"
  exit 1
fi

echo "==> Comparando contra baseline"

if ! command -v node >/dev/null 2>&1; then
  color_red "node não encontrado — necessário para compare-baseline.js"
  exit 1
fi

if node "$ROOT/.harness/compare-baseline.js" "$BASELINE" "$METRICS"; then
  color_green "QUALITY GATE: PASS"
  exit 0
else
  color_red "QUALITY GATE: FAIL"
  exit 1
fi
