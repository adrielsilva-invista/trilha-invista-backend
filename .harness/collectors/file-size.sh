#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# file-size.sh
# Contrato: recebe nada. Imprime {"largest_file_lines": N, "largest_file_path": "..."}.
# Genérico, funcional. Limite duro padrão = 800 linhas.
#
# Configurável via env vars:
#   FILE_EXTENSIONS   default: "cs js ts jsx tsx py go rb java kt rs php"
#   MAX_FILE_LINES    default: 800
#   EXCLUDE_DIRS      default: "node_modules .git .harness plan-build dist build out bin obj coverage .next .venv venv __pycache__ vendor"

EXTS="${FILE_EXTENSIONS:-cs js ts jsx tsx py go rb java kt rs php}"
MAX="${MAX_FILE_LINES:-800}"
EXCL="${EXCLUDE_DIRS:-node_modules .git .harness plan-build dist build out bin obj coverage .next .venv venv __pycache__ vendor}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Constrói args de exclusão para find
prune_args=()
for d in $EXCL; do
  prune_args+=( -path "*/$d" -o -path "*/$d/*" -o )
done
# remove o último -o pendente
unset 'prune_args[${#prune_args[@]}-1]'

# Constrói filtro por extensão
name_args=()
first=true
for e in $EXTS; do
  if $first; then
    name_args+=( -name "*.$e" )
    first=false
  else
    name_args+=( -o -name "*.$e" )
  fi
done

# Lista todos os arquivos de código
files=$(find "$ROOT" \( "${prune_args[@]}" \) -prune -o -type f \( "${name_args[@]}" \) -print 2>/dev/null || true)

largest=0
largest_path=""
violations=0

if [ -n "$files" ]; then
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    n=$(wc -l < "$f" | tr -d ' ')
    [ -z "$n" ] && n=0
    if [ "$n" -gt "$largest" ]; then
      largest="$n"
      largest_path="${f#$ROOT/}"
    fi
    if [ "$n" -gt "$MAX" ]; then
      violations=$((violations + 1))
    fi
  done <<< "$files"
fi

# Se algum arquivo está acima do limite duro: imprime largest mas falha implicitamente
# (o gate o detectará pela comparação contra baseline; o baseline nunca terá um arquivo
#  acima de MAX porque o baseline atual reflete o estado inicial, e arquivos novos
#  acima do limite reprovam por "largest_file_lines > baseline").
echo "{\"largest_file_lines\": ${largest}, \"largest_file_path\": \"${largest_path}\", \"over_limit_count\": ${violations}, \"max_lines_limit\": ${MAX}}"
