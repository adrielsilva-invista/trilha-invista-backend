# Mudanças — branch `fix/harness-estacao-4`

> Documento de apoio, **não trackeado** (não commitar). PRs: #27 (e2e) e #29 (endurecimento do gate), ambos base `dev`.

3 commits, 14 arquivos, +470 / −21.

| Commit | Tema |
|---|---|
| `f34616d` | `feat(harness)`: npm test vira gate absoluto |
| `5141951` | `feat(e2e)`: testes e2e reais contra Postgres |
| `62e37ea` | `fix(harness)`: baseline no piso real + compliance sem asterisco |

---

## 1. `f34616d` — npm test vira gate absoluto

**Problema:** o gate só via cobertura; teste vermelho podia passar se a cobertura não caísse. Além disso, um bug latente deixava o compliance-grep **cego** desde o merge do kanban.

### Arquivos
- **`.harness/collectors/tests.sh`** (novo) — roda `jest --json --silent`, emite `{"test_failures": N}` (soma `numFailedTests` + `numFailedTestSuites`; se `success:false` com 0, força 1). Sem arquivo temporário — pipa stdout do jest direto pro node.
- **`.harness/compare-baseline.js`** — nova checagem no topo: `test_failures`, `direction: eq`, `absolute: true`. Teste vermelho reprova na hora, não respeita catraca.
- **`.harness/quality-gate.sh`** — coletor `tests` roda antes do coverage; a merge dos JSONs passou a receber os dados via `process.argv` em vez de template-literal.
  - **Bug corrigido:** a merge antiga interpolava o JSON do compliance dentro de uma template-literal `` `$cmp` ``. O `kanban.mjs` contém backtick + `${...}`, o que gerava `SyntaxError` → merge virava `{}` → `compliance_violations: null` → gate **pulava** compliance silenciosamente. Estava cego desde o merge do kanban.
- **`.harness/collectors/compliance-grep.sh`** — adicionado `scripts/` às `EXCLUDE_DIRS` (tooling `.mjs`, não código de app).

---

## 2. `5141951` — testes e2e reais contra Postgres

**Objetivo:** adaptar os testes pra falar com o banco de verdade (container Postgres), mantendo os unitários de `src/**` como validação. 17 casos e2e, 4 suites.

### Infra de teste (nova)
- **`test/helpers.ts`** — `bootApp()` boota o app real e **replica o `ValidationPipe`** do `main.ts` (ele vive no bootstrap, não no AppModule — sem isso os 400 de DTO não disparam). `truncar()` roda `TRUNCATE tickets, users RESTART IDENTITY CASCADE`. `semearUsuario()` cria user com hash bcrypt real. `loginToken()` loga via HTTP e devolve o Bearer.
- **`test/e2e-setup.ts`** — `globalSetup` do jest: cria o banco `trilha_invista_test` (idempotente, ignora "já existe") e roda `prisma migrate deploy`.
- **`test/load-env.ts`** — `setupFiles`: carrega `.env.test` no worker (o globalSetup roda em processo separado).
- **`.env.test`** *(gitignored, não versionado)* — aponta pro banco `_test` dedicado + `JWT_SECRET` de teste.

### Specs e2e (novos)
- **`test/auth.e2e-spec.ts`** — 3 casos: login 200 + JWT válido / 401 senha errada / 401 email inexistente.
- **`test/usuario.e2e-spec.ts`** — 4 casos: 201 ADMIN (resposta sem `passwordHash`, persiste) / 403 CLIENTE / 401 sem token / 409 email duplicado (constraint UNIQUE real do Postgres).
- **`test/chamado.e2e-spec.ts`** — 6 casos: POST (201 nasce `AWAITING_CLASSIFICATION` / 400 corpo só-espaços / 403 ADMIN / 401 sem token) + PATCH state-machine (FUNCIONARIO conduz OPEN→IN_PROGRESS 200 / ADMIN cancela AWAITING 200 / transição de estado final RESOLVED→409 / 404 inexistente / 403 CLIENTE).

### Config
- **`test/jest-e2e.json`** — `+globalSetup`, `+setupFiles`, `maxWorkers: 1` (serial, banco compartilhado), `testTimeout: 30000` (boot do Nest estourava os 5s padrão no hook).
- **Tipagem:** `INestApplication<App>` nos specs e no helper → `getHttpServer()` retorna `App` em vez de `any`, matando os warnings `no-unsafe-argument` do supertest.
- **`CLAUDE.md`** — granularidade agora cobre `fix/` além de `feat/` (1 unidade = 1 branch = 1 PR); registrado que o agente abre/sobe branch e o humano só aprova/mergeia.
- **`plan-build/baseline.json`** — `largest_file_lines` → 158 (`test/chamado.e2e-spec.ts`; limite duro 800 segue folgado).

**Nada tocado em `src/**`.** Os mockados unitários seguem intactos.

---

## 3. `62e37ea` — baseline no piso real + compliance sem asterisco

Três pontos de revisão endereçados.

### (a) Baseline coverage no piso real
- **`plan-build/baseline.json`** — `coverage_pct` 50.45 → **65.58**. O baseline estava velho; a escalada real foi 50.45→57.89→60.75 e mede-se 65.58 na dev. Fechada a folga fantasma de ~15 pontos.

### (b) Compliance absoluto, sem asterisco
- **`.harness/collectors/compliance-grep.sh`** — passa a varrer **só arquivos trackeados** (`git ls-files`). Isso torna a regra "sempre 0" absoluta de verdade: `.env` (gitignored) sai por natureza, não por glob de exceção. Removidos os globs `.env`/`.env.*` (o asterisco permanente). Mantidas as exclusões **semânticas**: `*.example` (template com placeholder) e `scripts/` (tooling). Sem git, cai pro comportamento antigo (walk + exclusões).
  - Verificado nos dois sentidos: 0 violações no estado atual **e** ainda pega secret plantado em arquivo trackeado (probe → 1 violação, removido).

### (c) Premissa do D-06 verificada
- **`plan-build/Progress.md`** — Prisma 7 exige driver adapter (`@prisma/adapter-pg`, mandatório até p/ Postgres) e remove `url` do datasource → confirmado contra a [doc oficial v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7). Decisão de fixar em `^6` mantida; só o check foi registrado.

---

## Verificação final
- `./.harness/quality-gate.sh` → **exit 0**: testes 0 vermelhos, coverage 65.58 ≥ 65.58, dup 0, lint 0, maior arquivo 158 ≤ 158, compliance 0.
- `npm run test:e2e` → **17/17 passando, 4 suites**.
