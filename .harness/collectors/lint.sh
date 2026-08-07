#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# lint.sh — ESLint
# Contrato: imprime no stdout {"lint_violations": <number>} (errors + warnings).

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# eslint sai com código !=0 quando há erros; capturamos o JSON de qualquer forma.
N=$(npx eslint "{src,test}/**/*.ts" -f json 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d||'[]');console.log(j.reduce((a,f)=>a+f.errorCount+f.warningCount,0))}catch{console.log('null')}})")
echo "{\"lint_violations\": ${N:-null}}"
