#!/bin/bash
set -e
[ -n "$BASH_VERSION" ] || { echo "Este script requer bash. No Windows use Git Bash ou WSL." >&2; exit 1; }

# compliance-grep.sh
# Contrato: recebe nada. Imprime {"compliance_violations": N, "details": [...]}.
# Gate ABSOLUTO: qualquer violação reprova o gate, não respeita catraca.
#
# Lê padrões da seção "forbidden_patterns" do plan-build/quality-gate.md.
# Aceita 3 formatos dentro de um bloco ```yaml ... ```:
#
#   forbidden_patterns:
#     # Formato 1 — lista simples (sem scope)
#     - "regex 1"
#
#     # Formato 2 — objeto inline (sem scope)
#     - pattern: "regex 2"
#
#     # Formato 3 — objeto multilinha (com scope via glob)
#     - pattern: "regex 3"
#       only_in: "**/*.Domain/**, **/*.Application/**"
#       message: "explicação humana"
#
# `only_in` aceita lista de globs separados por vírgula. Suporta ** (recursivo)
# e * (componente). Pattern só dispara em paths que combinam com algum glob.
# Sem only_in → pattern dispara em todos os arquivos.
#
# Excluídos: node_modules, .git, .harness, plan-build, *.example, testes, mocks.
# Linhas que aparentem ser comentários puros são ignoradas.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
QGATE="$ROOT/plan-build/quality-gate.md"

if [ ! -f "$QGATE" ]; then
  echo '{"compliance_violations": 0, "details": [], "warning": "quality-gate.md não encontrado"}'
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo '{"compliance_violations": 0, "details": [], "warning": "python3 não encontrado — compliance-grep desabilitado"}' >&2
  echo '{"compliance_violations": 0, "details": []}'
  exit 0
fi

python3 - "$ROOT" "$QGATE" <<'PYEOF'
import os, re, sys, json, subprocess

ROOT = sys.argv[1]
QGATE = sys.argv[2]

# Só arquivos trackeados no git entram na varredura. É o que torna "sempre 0"
# absoluto sem asterisco: .env (gitignored) e artefatos não-versionados somem
# por definição, não por glob de exceção.
try:
    out = subprocess.run(["git", "-C", ROOT, "ls-files", "-z"],
                          capture_output=True, text=True, check=True).stdout
    TRACKED = {p.replace("\\", "/") for p in out.split("\0") if p}
except (subprocess.CalledProcessError, FileNotFoundError):
    TRACKED = None  # sem git → cai pro comportamento antigo (walk + exclusões)

EXCLUDE_DIRS = {
    "node_modules", ".git", ".harness", "plan-build", "dist", "build", "out",
    "bin", "obj", "coverage", ".next", ".venv", "venv", "__pycache__", "vendor",
    "scripts",  # tooling CLI (.mjs geradores etc.) — não é código de app Nest
}
# Só escaneia arquivos TRACKEADOS no git (git ls-files). Regra "sempre 0" sem
# asterisco: .env é gitignored, então some por natureza — não por exceção especial.
EXCLUDE_FILE_GLOBS = ["*.example", "*.lock", "*.min.js", "*.map"]
TEST_PATH_MARKERS = ["/test/", "/tests/", "/mocks/", "/__mocks__/"]
TEST_NAME_MARKERS = ["_test.", ".test.", "_spec.", ".spec."]

# ─── 1. Parsear forbidden_patterns do quality-gate.md ────────────────────────
with open(QGATE, encoding="utf-8") as f:
    lines = f.readlines()

patterns = []
in_block = False
current = None

def flush():
    global current
    if current is not None:
        patterns.append(current)
        current = None

re_simple   = re.compile(r'^\s*-\s*"(.*)"\s*$')
re_obj_pat  = re.compile(r'^\s*-\s*pattern:\s*"(.*)"\s*$')
re_only_in  = re.compile(r'^\s+only_in:\s*"(.*)"\s*$')
re_message  = re.compile(r'^\s+message:\s*"(.*)"\s*$')

for line in lines:
    if "forbidden_patterns:" in line and not in_block:
        in_block = True
        continue
    if not in_block:
        continue
    if line.startswith("```"):
        flush()
        in_block = False
        continue
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        continue

    m_simple = re_simple.match(line)
    m_obj    = re_obj_pat.match(line)
    m_only   = re_only_in.match(line)
    m_msg    = re_message.match(line)

    if m_simple:
        flush()
        current = {"pattern": m_simple.group(1).replace('\\\\', '\\').replace('\\"', '"'),
                   "only_in": None, "message": ""}
    elif m_obj:
        flush()
        current = {"pattern": m_obj.group(1).replace('\\\\', '\\').replace('\\"', '"'),
                   "only_in": None, "message": ""}
    elif m_only and current is not None:
        current["only_in"] = m_only.group(1).replace('\\\\', '\\').replace('\\"', '"')
    elif m_msg and current is not None:
        current["message"] = m_msg.group(1).replace('\\\\', '\\').replace('\\"', '"')

flush()

if not patterns:
    print(json.dumps({"compliance_violations": 0, "details": []}))
    sys.exit(0)

# ─── 2. Compilar patterns + globs ────────────────────────────────────────────
def glob_to_regex(g):
    # Converte glob estilo ** /* pra regex. Não suporta {a,b}.
    out, i = [], 0
    while i < len(g):
        c = g[i]
        if c == "*":
            if i + 1 < len(g) and g[i + 1] == "*":
                out.append(".*")
                i += 2
                if i < len(g) and g[i] == "/":
                    i += 1
                continue
            out.append("[^/]*")
        elif c == "?":
            out.append("[^/]")
        elif c in r".+()|^$[]{}\\":
            out.append("\\" + c)
        else:
            out.append(c)
        i += 1
    return "^" + "".join(out) + "$"

for p in patterns:
    try:
        p["_re"] = re.compile(p["pattern"])
    except re.error as e:
        print(f"WARN: regex invalida '{p['pattern']}': {e}", file=sys.stderr)
        p["_re"] = None
    if p["only_in"]:
        globs = [g.strip() for g in p["only_in"].split(",") if g.strip()]
        p["_globs"] = [re.compile(glob_to_regex(g)) for g in globs]
    else:
        p["_globs"] = None

# ─── 3. Walk arquivos com exclusões ──────────────────────────────────────────
TEST_COMPONENTS = {"test", "tests", "mocks", "__mocks__"}
def is_test_path(rel):
    rel_norm = rel.replace("\\", "/")
    parts = rel_norm.split("/")
    # Qualquer componente do path bate como dir de teste (case-insensitive)
    if any(p.lower() in TEST_COMPONENTS for p in parts):
        return True
    # Sufixo .Tests/ comum em .NET (MyApp.Domain.Tests)
    if any(p.lower().endswith(".tests") for p in parts):
        return True
    name = parts[-1].lower()
    return any(m in name for m in TEST_NAME_MARKERS)

import fnmatch
def is_excluded_file(name):
    return any(fnmatch.fnmatch(name, g) for g in EXCLUDE_FILE_GLOBS)

def matches_only_in(rel, globs):
    rel_norm = rel.replace("\\", "/")
    return any(g.match(rel_norm) for g in globs)

COMMENT_PREFIXES = ("#", "//", "--", "/*", "*")

# ─── 4. Aplicar patterns ─────────────────────────────────────────────────────
violations = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fname in filenames:
        if is_excluded_file(fname):
            continue
        full = os.path.join(dirpath, fname)
        rel = os.path.relpath(full, ROOT)
        if TRACKED is not None and rel.replace("\\", "/") not in TRACKED:
            continue
        if is_test_path(rel):
            continue
        try:
            with open(full, encoding="utf-8", errors="replace") as fp:
                file_lines = fp.readlines()
        except (OSError, UnicodeDecodeError):
            continue

        for p in patterns:
            if p["_re"] is None:
                continue
            if p["_globs"] is not None and not matches_only_in(rel, p["_globs"]):
                continue
            for lineno, raw in enumerate(file_lines, 1):
                stripped = raw.lstrip()
                if stripped.startswith(COMMENT_PREFIXES):
                    continue
                if p["_re"].search(raw):
                    violations.append({
                        "file": rel.replace("\\", "/"),
                        "line": lineno,
                        "pattern": p["pattern"],
                        "message": p["message"],
                        "match": raw.rstrip()[:200],
                    })

print(json.dumps({"compliance_violations": len(violations), "details": violations}))
PYEOF
