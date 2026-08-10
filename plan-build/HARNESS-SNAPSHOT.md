# Harness Snapshot — Classificador Inteligente de Chamados

> Gerado em 2026-08-10. Fotografia do estado do harness, da migração .NET→Node, e do progresso das sprints.
> Documento de leitura para o humano. Fonte de verdade viva continua em `plan-build/Progress.md`.

---

## 1. O que é o harness (visão de 30s)

Três catracas que deixam a IA codar rápido **sem** deixar a entropia ganhar:

1. **Feed-forward** (`.claude/skills/harness`) — retoma contexto entre sessões via `plan-build/`.
2. **Quality Gate** (`.harness/`) — 5 métricas viram catraca; PR não pode degradar baseline.
3. **Decisão técnica** (`.claude/skills/squad-vote`) — bifurcação técnica é votada por squads; negócio ainda para pra humano.

Loop de PR: `1 TASK = 1 branch feat/** = 1 PR` → gate → auto-PR dev → merge → auto-PR main → merge.

---

## 2. Migração .NET → Node/NestJS (o que mudou do harness anterior pra este)

O harness **nasceu C#/.NET 10** e foi migrado pra **Node 20 / NestJS 11 / TypeScript**. A migração foi **incremental** e só fechou de fato nesta sprint.

| Área | Harness anterior (.NET) | Harness atual (Node/NestJS) | Quando migrou |
|---|---|---|---|
| **Stack `quality-gate.md §1`** | .NET 10, xUnit, `dotnet format`, coverlet | TS/NestJS 11, Jest (ts-jest), ESLint 9 + Prettier, jscpd | Sprint-0 |
| **Coletor coverage** | coverlet / `dotnet test` | Jest `--coverage` → `coverage/coverage-summary.json` | Sprint-0 |
| **Coletor lint** | `dotnet format --verify-no-changes` | `eslint` (typescript-eslint) | Sprint-0 |
| **Coletor duplication** | jscpd (já multi-stack) | jscpd via `npx` | Sprint-0 (sem mudança real) |
| **Coletor file-size** | genérico (linhas) | genérico (linhas) | inalterado |
| **Coletor compliance-grep** | patterns C# (`using`, `DateTime.Now`, `Guid.NewGuid`) | patterns TS (`:any`, `@ts-ignore`, `console.*`, `throw new Error`) | Sprint-0 |
| **Standard `clean-architecture.md`** | 4 `.csproj`, `using Microsoft.EntityFrameworkCore`, `IClock`/`IIdGenerator`, escopo `**/*.Domain/**` | 1 módulo Nest/domínio + camadas por pasta, imports TS, ports Nest, escopo `src/**/domain/**` | **Sprint-1 (2026-08-10 — esta sessão, D-08)** |
| **Patterns de isolamento no gate** | `clean_arch_dotnet` (diferido/comentado) | `clean_arch_nest` **ativo** (folder-scoped) | **Sprint-1 (2026-08-10, D-08)** |

### A pegadinha da migração (D-03 → D-08)

O standard .NET dizia *"Application NÃO importa o framework web (ASP.NET)"*. Portar isso **ao pé da letra** reprovaria todo o código Nest já mergeado, porque em NestJS a `application/` **usa de propósito** `@nestjs/common` (`@Injectable`, `@Inject`, `ConflictException`, `UnauthorizedException`) — é o vocabulário idiomático de DI e exceptions HTTP.

**Calibração adotada (D-03 + D-08):**
- `domain/` → **puríssimo**: zero `@nestjs/*`, zero `@prisma/client`/`bullmq`/`@anthropic-ai`/`jsonwebtoken`/`bcryptjs`, sem `new Date`/`Math.random`.
- `application/` → **pode** `@nestjs/common`; **não pode** `@prisma/client`/`bullmq`/`@anthropic-ai`/`@nestjs/core`, sem I/O de relógio/aleatório.

Resultado: catraca de isolamento ligada com **0 violações** no código existente.

### Ainda com resquício .NET (dívida menor, cosmética)

- `quality-gate.md §2.4` — exemplo de output usa `"largest_file_path": "src/foo/bar.cs"` (`.cs`). Cosmético, não afeta o coletor.
- Bloco `cnpj-alfanumerico` no §3 traz exemplos comentados em C# (`long.TryParse`, `Convert.ToInt64`). É opt-in e está comentado — só vira TS se o projeto adotar CNPJ.

---

## 3. Árvore de arquivos do harness

```
trilha-invista-backend/
├── CLAUDE.md                              ← regras: isolamento (P1) + Quality Gate (P2) + squad-vote (P3)
│
├── .claude/
│   ├── settings.json / settings.local.json
│   └── skills/
│       ├── harness/SKILL.md               ← feed-forward: retoma contexto (/harness)
│       ├── babysit/SKILL.md               ← feed-back: loop de PR até merge
│       ├── squad-vote/                    ← decisão técnica via votação de squads
│       │   ├── SKILL.md
│       │   ├── classifier.md              ← técnica vs negócio vs cinza
│       │   ├── voting-rules.md            ← quórum 3 + arquitetura desempata
│       │   ├── calibration-log.md
│       │   ├── templates/{vote,decision}.json
│       │   └── runs/{votes,decisions}/    ← histórico auditável (.gitkeep)
│       ├── dba/                           ← DBA sênior PostgreSQL
│       │   ├── SKILL.md
│       │   └── references/{data-types,naming,patterns-antipatterns}.md
│       ├── debug-issue/SKILL.md
│       ├── explore-codebase/SKILL.md
│       ├── refactor-safely/SKILL.md
│       └── review-changes/SKILL.md
│
├── .harness/
│   ├── quality-gate.sh                    ← orquestra os coletores + compara baseline
│   ├── compare-baseline.js                ← lógica da catraca (nova vs baseline)
│   └── collectors/
│       ├── coverage.sh                    ← Jest --coverage
│       ├── duplication.sh                 ← jscpd
│       ├── lint.sh                        ← eslint
│       ├── file-size.sh                   ← maior arquivo (linhas)
│       └── compliance-grep.sh             ← patterns proibidos (Python parser de YAML)
│
├── plan-build/
│   ├── spec.md                            ← produto + arquitetura DESTE projeto
│   ├── Sprint-1.md                        ← sprint ativa (Builder ↔ Evaluator)
│   ├── Progress.md                        ← MEMÓRIA entre sessões (ler primeiro)
│   ├── quality-gate.md                    ← 5 métricas + forbidden_patterns
│   ├── baseline.json                      ← snapshot da catraca
│   ├── STACK-SETUP.md                     ← checklist stack-specific
│   └── standards/                         ← padrões inegociáveis da empresa
│       ├── clean-architecture.md          ← ✅ migrado p/ NestJS (v2.0)
│       ├── clean-code.md
│       ├── barramento-worker.md           ← BYPASS neste projeto (D-04, REST standalone)
│       └── cnpj-alfanumerico.md           ← opt-in (não usado)
│
└── .github/
    ├── workflows/
    │   ├── quality-gate.yml               ← CI: roda gate em push/PR
    │   └── auto-pr.yml                     ← auto-PR feat→dev→main
    └── code-review-graph.instruction.md   ← graph-first (MCP code-review-graph)
```

**40 arquivos, 19 diretórios.**

---

## 4. Quality Gate — as 5 métricas

| Métrica | Catraca | Coletor | Atual | Baseline |
|---|---|---|---|---|
| Cobertura de testes | não pode reduzir | `coverage.sh` | 57.89% | 50.45% |
| Duplicação | não pode aumentar | `duplication.sh` | 0% | 0% |
| Lint | não pode aumentar | `lint.sh` | 0 | 0 |
| Maior arquivo (linhas) | não pode aumentar | `file-size.sh` | 79 | 79 |
| Compliance grep | **sempre 0** (absoluto) | `compliance-grep.sh` | 0* | 0 |

\* único hit é `.env` local (JWT_SECRET literal), gitignored/não-trackeado — não entra no gate oficial.

**Último gate:** `bash .harness/quality-gate.sh` → **exit 0 (PASS)**.

---

## 5. Status das Sprints

**São 3 sprints (0, 1, 2).**

| Sprint | Escopo | Status |
|---|---|---|
| **Sprint-0** | Setup do harness + CI GitFlow | ✅ CONCLUÍDA (2026-08-07) |
| **Sprint-1** | Fundação: auth, usuários, ciclo do chamado — **sem IA** | 🟡 EM ANDAMENTO |
| **Sprint-2** | IA (Claude) + fila (BullMQ/Redis) + atribuição + histórico | 🔴 PENDENTE (não planejada) |

### Sprint-1 — detalhe (3/6 TASKs, 50%)

```
TASK-01 | [██████████] | Modelo de dados (Prisma + Postgres)     | ✅ CONCLUÍDA
TASK-02 | [██████████] | Autenticação e RBAC (RF-01)             | ✅ CONCLUÍDA
TASK-03 | [██████████] | Admin cria usuário (RF-02)              | ✅ CONCLUÍDA
TASK-04 | [░░░░░░░░░░] | Cliente abre chamado (RF-03)            | 🔴 PENDENTE ← próxima
TASK-05 | [░░░░░░░░░░] | Máquina de estados do chamado (RF-09)   | 🔴 PENDENTE
TASK-06 | [░░░░░░░░░░] | Cliente acompanha seus chamados (RF-10) | 🔴 PENDENTE
```

**Testes:** 21/21 verdes (jest) · **Build:** `tsc --noEmit` limpo · **Gate:** exit 0

**Próximo passo exato:**
> TASK-04 — cliente abre chamado (RF-03), branch `feat/crud-chamado` a partir de dev. `POST /chamados` (guard `@Perfis CLIENTE`): valida DTO, cria `Ticket` com `authorId = req.user.sub`, nasce `AWAITING_CLASSIFICATION` (sem IA na S1), persiste via repositório de infra.

---

## 6. Bloqueios ativos

| # | Bloqueio | Impacto |
|---|---|---|
| B-01 | Anexo A do PRD (matriz de taxonomia) `[ABERTO]` | Só Sprint-2. Não bloqueia Sprint-1. |
| B-02 | Config de repo (Branch Protection + permissão Actions) na UI GitHub | Ação do humano. Sem isso o gate não barra merge e o auto-PR dá 403. |

**Dependência recorrente:** e2e reais contra Postgres pendem de **Docker** (bloqueado na máquina). Não trava TASK-04..06 — tudo unit-testável com mocks nos ports.

---

## 7. Decisões arquiteturais (registro auditável)

| # | Decisão | Sprint |
|---|---|---|
| D-01 | Provider de IA = **Claude (Anthropic)**, não OpenAI | S2 |
| D-02 | Fila = **BullMQ + Redis** | S2 |
| D-03 | Clean Arch adaptado = **1 módulo Nest/domínio + camadas por pasta** | S1 |
| D-04 | **Bypass de `barramento-worker.md`** (REST standalone, não worker NATS) | — |
| D-05 | **Sprint-1 = fundação sem IA**; IA/fila/atribuição/histórico → Sprint-2 | S1 |
| D-06 | **Prisma fixado em ^6** (não 7 — evita driver adapter + prisma.config.ts) | S1 |
| D-07 | **Schema full-English + soft delete**; email de user soft-deleted NÃO se reusa | S1 |
| D-08 | **Catraca de isolamento de camada ATIVADA** (`clean_arch_nest`); calibração application pode `@nestjs/common` | S1 |

---

## 8. Dívidas conhecidas (não bloqueiam)

- **`baseline.json`** já está correto (50.45/79) — não há defasagem pendente.
- **Docs de API** via `@nestjs/swagger` — backlog explícito do humano ("futuramente, agora não"). Endpoints a documentar quando entrar: `POST /auth/login`, `POST /usuarios`, `POST /chamados`.
- **Resquício .NET cosmético** — `.cs` no exemplo de output do §2.4 e exemplos C# comentados no bloco `cnpj-alfanumerico`.
- **`npm test` explícito** no `quality-gate.yml` — hoje teste vermelho só reprova via queda de cobertura, não como sinal de 1ª classe (humano adiciona).
