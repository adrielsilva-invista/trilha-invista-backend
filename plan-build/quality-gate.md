# quality-gate.md

> Define como o Quality Gate roda neste projeto. Catraca: PR não pode degradar nenhuma métrica do baseline.

---

## 1. Stack deste projeto

- **Linguagem:** TypeScript (NestJS 11) sobre Node 20+
- **Test runner:** Jest (ts-jest)
- **Linter:** ESLint 9 (typescript-eslint) + Prettier
- **Cobertura:** Jest `--coverage` (json-summary → `coverage/coverage-summary.json`)
- **Duplicação:** jscpd (via npx, multi-stack)

---

## 2. Métricas medidas

### 2.1 Cobertura de testes (`coverage_pct`)

- **Coletor:** `.harness/collectors/coverage.sh`
- **Regra:** `nova >= baseline`. Não pode reduzir.
- **Output esperado:** `{"coverage_pct": 73.4}`

### 2.2 Duplicação de código (`duplication_pct`)

- **Coletor:** `.harness/collectors/duplication.sh`
- **Regra:** `nova <= baseline`. Não pode aumentar.
- **Output esperado:** `{"duplication_pct": 4.2}`

### 2.3 Violações de lint (`lint_violations`)

- **Coletor:** `.harness/collectors/lint.sh`
- **Regra:** `nova <= baseline`. Não pode aumentar.
- **Output esperado:** `{"lint_violations": 12}`

### 2.4 Tamanho do maior arquivo (`largest_file_lines`)

- **Coletor:** `.harness/collectors/file-size.sh`
- **Regra:** `nova <= baseline`. Não pode aumentar.
- **Limite duro:** `MAX_FILE_LINES` (default 800). Arquivo NOVO acima do limite reprova.
- **Output esperado:** `{"largest_file_lines": 412, "largest_file_path": "src/foo/bar.cs"}`

### 2.5 Compliance grep (`compliance_violations`)

- **Coletor:** `.harness/collectors/compliance-grep.sh`
- **Regra ABSOLUTA:** `compliance_violations == 0`. Sempre. Não respeita catraca.
- **Output esperado:** `{"compliance_violations": 0, "details": []}`

---

## 3. Padrões proibidos (compliance-grep)

> Lista de regex/strings que NÃO podem aparecer no código. O coletor faz grep recursivo
> excluindo `node_modules`, `.git`, `.harness`, `plan-build`, `*.example`, comentários,
> testes e mocks.
>
> Exemplos comentados — descomente e ajuste conforme o projeto:

```yaml
forbidden_patterns:
  # ═══════════════════════════════════════════════════════════════════
  # Stack: NestJS + TypeScript. Patterns adaptados de C# → TS.
  # Clean Code — ATIVO por default (ver standards/clean-code.md).
  # Princípio-mãe: código é lido muito mais vezes do que escrito.
  # ═══════════════════════════════════════════════════════════════════

  - pattern: "\\b(TODO|FIXME|HACK|XXX)\\b"
    message: "TODO/FIXME/HACK em produção. Resolva ou abra issue rastreável (ex.: TODO(JIRA-123))."

  - pattern: "console\\.(log|debug|info|warn|error)\\("
    message: "Use Logger do Nest (@nestjs/common), não console.*."

  - pattern: "throw\\s+new\\s+Error\\("
    message: "Error genérico. Use HttpException do Nest ou exception de domínio específica."

  - pattern: ":\\s*any\\b"
    message: "Tipo 'any' proibido. Tipe explicitamente ou use unknown + narrowing."

  - pattern: "@ts-(ignore|nocheck|expect-error)"
    message: "Silenciar o compilador é proibido. Corrija a tipagem."

  - pattern: "catch\\s*\\([^)]*\\)\\s*\\{\\s*\\}"
    message: "Catch vazio. Trate explicitamente ou propague."

  - pattern: "class\\s+\\w+(Manager|Helper|Util|Utility|Common|Misc)\\b"
    message: "Nome genérico (Manager/Helper/Util). Renomeie pelo verbo que a classe faz."

  # ── Secrets literais (trust boundary — nunca hardcode) ──────────────
  - pattern: "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*[\"'][^\"']{8,}[\"']"
    message: "Secret literal no código. Use variável de ambiente / .env (fora do repo)."

  # ── Clean Architecture (layer isolation) — ATIVO ───────────────────
  # Fonte de verdade: standards/clean-architecture.md (bloco clean_arch_nest).
  # Folder-scoped via only_in. Ativado quando src/**/domain e src/**/application
  # passaram a existir (auth, usuario — TASK-02/03). Adaptação NestJS (D-03):
  # domain é puríssimo; application PODE @nestjs/common (DI + HttpException),
  # mas NÃO @prisma/client, bullmq, @anthropic-ai, @nestjs/core.

  # domain/ é puríssimo: nada de framework Nest.
  - pattern: "from\\s+['\"]@nestjs/"
    only_in: "src/**/domain/**"
    message: "domain/ não importa @nestjs/*. Domínio é puro (D-03). Mova DI/HTTP para application/ ou borda."

  # domain/ e application/ não conhecem ORM/fila/IA/cripto concreta.
  - pattern: "from\\s+['\"](@prisma/client|bullmq|@anthropic-ai|jsonwebtoken|bcryptjs)"
    only_in: "src/**/domain/**, src/**/application/**"
    message: "domain/ e application/ não conhecem ORM/fila/IA/cripto. Use um port + implementação na infrastructure/."

  # application/ não importa @nestjs/core (Reflector/ExecutionContext são de guard/borda).
  - pattern: "from\\s+['\"]@nestjs/core"
    only_in: "src/**/application/**"
    message: "application/ não importa @nestjs/core (Reflector/ExecutionContext são de guard/borda)."

  # Sem relógio/aleatório direto no domínio ou use case (quebra testes determinísticos).
  - pattern: "new\\s+Date\\(|Date\\.now\\(|Math\\.random\\(|crypto\\.randomUUID\\("
    only_in: "src/**/domain/**, src/**/application/**"
    message: "Ponto de I/O escondido. Injete um port (Clock/IdGenerator) e implemente na infrastructure/."

  # CNPJ Alfanumérico — OPT-IN (ver standards/cnpj-alfanumerico.md).
  # Descomente SOMENTE se o projeto valida/recebe/persiste CNPJ. CNPJ passa a
  # aceitar letras nas 12 primeiras posições (IN RFB 2.229/2024, vigência jul/2026).
  # - pattern: "(?i)cnpj[^\\n]{0,40}\\\\d\\{14\\}"
  #   message: "CNPJ validado como 14 dígitos numéricos. CNPJ é alfanumérico — valide [0-9A-Z]{12}[0-9]{2}."
  # - pattern: "(?i)cnpj[^\\n]{0,40}\\[0-9\\]\\{14\\}"
  #   message: "CNPJ validado como 14 dígitos numéricos. As 12 primeiras posições aceitam A-Z."
  # - pattern: "(?i)(long|int|Int64|Int32|ulong)\\.(Try)?Parse\\([^)]*cnpj"
  #   message: "CNPJ convertido para inteiro. Trafegue e persista CNPJ como string."
  # - pattern: "(?i)Convert\\.To(Int64|Int32|UInt64)\\([^)]*cnpj"
  #   message: "CNPJ convertido para inteiro. Trafegue e persista CNPJ como string."
  # - pattern: "(?i)cnpj[^\\n]{0,40}\\.All\\(char\\.IsDigit\\)"
  #   message: "CNPJ validado como só-dígitos. As 12 primeiras posições aceitam A-Z."

  # Node (exemplo):
  # - "any\\s*[,)]"             # tipagem any proibida
  # - "@ts-ignore"              # silenciar tipagem é proibido

  # Go (exemplo):
  # - "panic\\("                # sem panic em código de produção
  # - "fmt\\.Println"           # use logger estruturado

  # Python (exemplo):
  # - "print\\("                # use logging
  # - "except:\\s*pass"         # except vazio proibido
```

---

## 4. Baseline

### Como gerar inicial

```bash
bash .harness/quality-gate.sh --generate-baseline
```

Gera/atualiza `plan-build/baseline.json` com os valores atuais. Commitar junto com a Sprint.

### Quando atualizar

- ✅ **Quando a métrica MELHORA:** cobertura subiu? duplicação caiu? lint zerado? Atualize o baseline e commit no mesmo PR.
- ❌ **Nunca atualizar para "passar" um PR ruim.** Catraca não negocia.
- ✅ Após refactor que reduziu o maior arquivo: atualizar.
- ✅ Quando uma Sprint fecha e melhorou números: atualizar como parte do fechamento.

Atualizações de baseline DEVEM ser registradas em "Histórico de mudanças do baseline" abaixo.

---

## 5. Como rodar localmente

```bash
# Rodar gate completo (compara com baseline)
bash .harness/quality-gate.sh

# Gerar/atualizar baseline a partir do código atual
bash .harness/quality-gate.sh --generate-baseline

# Rodar coletor isolado
bash .harness/collectors/coverage.sh
bash .harness/collectors/duplication.sh
bash .harness/collectors/lint.sh
bash .harness/collectors/file-size.sh
bash .harness/collectors/compliance-grep.sh
```

Exit 0 = passou. Exit 1 = catraca rompida.

---

## 6. Como o gate roda no CI

- Workflow: `.github/workflows/quality-gate.yml`
- Trigger: `pull_request` e `push` em `main`.
- Steps: checkout → setup stack → install deps → `bash .harness/quality-gate.sh` → upload artefatos → comentário no PR com sumário.

---

## 7. Definition of Done atualizada

Mesma do `spec.md`, repetida aqui pra reforço:

- [ ] Build limpo, sem warnings.
- [ ] Testes passando.
- [ ] `bash .harness/quality-gate.sh` exit 0.
- [ ] Reviewers automáticos sem comentários abertos.
- [ ] Conversations resolvidas.
- [ ] `Progress.md` atualizado.

---

## 8. Reviewers automáticos configurados

- **CI estrutural:** `.github/workflows/quality-gate.yml`
- **LLM reviewer:** <PREENCHER — ex: GitHub Copilot Code Review, CodeRabbit, Codium PR-Agent>
- **Política:** humano só aprova depois que CI + LLM reviewer estão verdes e sem comentários abertos.

---

## 9. Histórico de mudanças do baseline

> Append-only. Toda alteração de baseline vai aqui.

| Data | Métrica | De | Para | Motivo | PR |
|---|---|---|---|---|---|
| 2026-08-07 | coverage_pct | 50 | 50.45 | Testes de auth (domain+usecase+guard) subiram cobertura | feat/auth-rbac |
| 2026-08-07 | largest_file_lines | 29 | 79 | Baseline 29 era do scaffold vazio (`test/app.e2e-spec.ts`); código real de feature (TASK-02) é maior. Teto legítimo. | feat/auth-rbac |
