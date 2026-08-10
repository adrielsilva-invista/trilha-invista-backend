<!--
CONVENÇÕES OBRIGATÓRIAS DESTE ARQUIVO (não apagar):

- "Visão Geral das Sprints", "Status Visual", "Bloqueios" e "Decisões" são TABELAS VIVAS:
  atualizadas ao longo das sessões. NÃO são append-only.
- "Log de Sessões" é APPEND-ONLY: nunca apague registros antigos.
- Quando uma Sprint conclui, adicione uma nova "Status Visual da Sprint-N" abaixo da
  anterior (mantém histórico visual de todas as sprints).
- IDs de decisão (D-01, D-02, ...) são SEQUENCIAIS e NUNCA reusados.
- Status visual usa: 🔴 (pendente) | 🟡 (em andamento) | ✅ (concluída) | ⛔ (bloqueada)
- Barra de progresso por TASK: [██████████] = 100%, [█████░░░░░] = 50%, [░░░░░░░░░░] = 0%.
- "Próximo passo exato" = UMA FRASE acionável, sem ambiguidade.
- "Próxima Sessão" no final é o que /harness lê PRIMEIRO ao retomar.
-->

# Progress.md — Classificador Inteligente de Chamados

> Memória entre sessões. Atualizar ao final de CADA sessão.
> Agente: leia isto PRIMEIRO antes de qualquer ação.

---

## 🗺️ Visão Geral das Sprints

| Sprint | Status | Início | Conclusão |
|--------|--------|--------|-----------|
| Sprint-0: Setup do harness + CI GitFlow | ✅ CONCLUÍDA | 2026-08-07 | 2026-08-07 |
| Sprint-1: Fundação (auth, usuários, ciclo do chamado — sem IA) | 🟡 EM ANDAMENTO | 2026-08-07 | — |
| Sprint-2: IA + fila + atribuição + histórico | 🔴 PENDENTE | — | — |

---

## Status Visual da Sprint Ativa

```
Sprint-1 — Fundação (sem IA)
TASK-01 | [██████████] | Modelo de dados (Prisma + Postgres)        | ✅ CONCLUÍDA (migrate init aplicada)
TASK-02 | [██████████] | Autenticação e RBAC (RF-01)                | ✅ CONCLUÍDA
TASK-03 | [██████████] | Admin cria usuário (RF-02)                 | ✅ CONCLUÍDA
TASK-04 | [░░░░░░░░░░] | Cliente abre chamado (RF-03)               | 🔴 PENDENTE
TASK-05 | [░░░░░░░░░░] | Máquina de estados do chamado (RF-09)      | 🔴 PENDENTE
TASK-06 | [░░░░░░░░░░] | Cliente acompanha seus chamados (RF-10)    | 🔴 PENDENTE
```

Progresso geral: 3/6 TASKs (50%)

**Resultado dos testes:**
```
jest | 21/21 | domain perfil (3), LoginUseCase (3), PerfilGuard (5), PrismaService (2), app (1),
             | CriarUsuarioUseCase (3), PrismaUsuarioRepository (3), UsuarioController (1)
```
**Build:** ✅ `tsc --noEmit` limpo
**bash .harness/quality-gate.sh:** exit 0 (coverage 57.89 / dup 0 / lint 0 / maior arquivo 79 / compliance skip)

---

## Bloqueios Ativos

| # | Bloqueio | Componente(s) | Impacto |
|---|----------|---------------|---------|
| B-01 | Anexo A do PRD (matriz de taxonomia) `[ABERTO]` | `classificacao` (RF-04) | Afeta só Sprint-2. Sem ela a classificação mede consistência, não acerto. Decisão do stakeholder. NÃO bloqueia Sprint-1. |
| B-02 | Config de repo (UI GitHub) pendente | CI/CD | Branch Protection em `main`/`dev` exigindo check `gate`; Actions "Read and write" + "Allow create PR". Sem isso o gate não barra merge e o auto-PR dá 403. Ação do humano. |

---

## Decisões Tomadas

| # | Decisão | Sprint | Contexto |
|---|---------|--------|---------|
| D-01 | Provider de IA = **Claude (Anthropic)**, não OpenAI | Sprint-2 | Stakeholder trocou. PRD e spec atualizados; "Structured Outputs" → "tool use" (JSON Schema via `tool_choice` forçado). Código só na Sprint-2. |
| D-02 | Fila = **BullMQ + Redis** | Sprint-2 | Escolhido sobre worker in-process. Adiciona Redis à infra (docker-compose, CI service, `REDIS_URL`). Retry/backoff prontos para RF-05. |
| D-03 | Clean Architecture adaptado = **1 módulo Nest por domínio + camadas por pasta** (`domain/`, `application/`+`ports/`, `infrastructure/`, controller) | Sprint-1 | Standard é .NET (4 .csproj); adaptado a NestJS. Ativa compliance-grep de isolamento folder-scoped (`only_in: src/**/domain/**`). |
| D-04 | **Bypass de `barramento-worker.md`** | — | Projeto é REST NestJS standalone, não worker NATS. Bypass legítimo (standard exclui adaptadores REST). Registrado em spec §0. |
| D-05 | **Sprint-1 = fundação sem IA** (RF-01/02/03/09/10); IA/fila/atribuição/histórico → Sprint-2 | Sprint-1 | Isola o risco (Claude) da S2. Consequência aceita: chamado nasce AGUARDANDO_CLASSIFICACAO e fica parado até a S2. |
| D-06 | **Prisma fixado em ^6** (não 7) | Sprint-1 | Prisma 7 exige driver adapter (@prisma/adapter-pg) + `prisma.config.ts` e remove `url` do datasource — cerimônia desnecessária pro escopo. Confirmado pelo humano (downgrade = decisão de dependência, CLAUDE.md Parte 3). |
| D-07 | **Schema full-English + soft delete; email de user soft-deleted NÃO se reusa** | Sprint-1 | Revisão DBA: tabelas/colunas renomeadas p/ inglês snake_case (`@map`/`@@map`), `timestamptz`, `deleted_at` em `users` e `tickets`. `users_email_key` fica UNIQUE **global** (não parcial) — decisão do humano: reuso de email de usuário soft-deleted é bloqueado no banco. Query de login segue `findUnique({email})` sem filtro `deletedAt`. Enum `Perfil` mantido pt-BR (traduzir p/ `Role` = refactor de auth, escopo separado). |
| D-08 | **Catraca de isolamento de camada ATIVADA** (`clean_arch_nest` no `quality-gate.md §3`) | Sprint-1 | Standard `clean-architecture.md` já estava v2.0 NestJS; faltava ativar os patterns folder-scoped que estavam `ponytail:`/diferidos desde D-03. Gatilho satisfeito: `src/**/domain` e `src/**/application` passaram a existir (auth, usuario). Calibração: domain puríssimo; application **pode** `@nestjs/common` (DI + HttpException), **não** `@prisma/client`/`bullmq`/`@anthropic-ai`/`@nestjs/core`. 0 violações no código mergeado (portar o rule .NET literal reprovaria todo `@Injectable`/`ConflictException`). Subido direto na `dev`. |

---

## Log de Sessões

> Append-only. Sessão mais antiga no topo, mais recente no fim.
> Template no final deste arquivo.

### Sessão 2026-08-07 — Setup do harness + pipeline CI GitFlow

**Tasks trabalhadas:** Sprint-0 (setup)
**Status ao encerrar:** ✅ Concluída

**O que foi feito:**
- Scaffold NestJS 11 criado do zero; `package.json` renomeado `trilha-invista-backend`; jest com `coverageReporters: [json-summary, text-summary]`.
- 5 coletores do Quality Gate adaptados C#→Node: coverage (jest), duplication (jscpd), lint (eslint), file-size (genérico), compliance-grep (patterns TS).
- `quality-gate.md` §1 (stack TS/NestJS/Jest/ESLint/jscpd) e §3 (forbidden_patterns TS) preenchidos.
- `.gitignore`, `.gitattributes` (`*.sh eol=lf`) criados; `void bootstrap()` corrigiu lint.
- `baseline.json` gerado (coverage 50 / dup 0 / lint 0 / maior arquivo 29 / compliance 0). Gate exit 0 local.
- CI GitFlow: `quality-gate.yml` (push/PR em main/dev/feat/**) + `auto-pr.yml` (workflow_run → feat→dev→main). Mergeado em main (PR #1).

**Decisões:** (registradas depois, na sessão de planejamento) D-01..D-05.

**O que ficou pendente:**
- Passo `npm test` explícito no `quality-gate.yml` (o humano adiciona) — hoje teste vermelho só reprova via queda de cobertura, não como sinal de 1ª classe.
- Config de repo na UI (Branch Protection + permissão de Actions) — B-02.

**Próximo passo exato:**
> Escrever spec.md, Sprint-1 e Progress.md (feito na sessão seguinte).

**Sensores rodados:**
- [x] build sem warnings
- [ ] testes passando (não há testes de feature ainda)
- [x] bash .harness/quality-gate.sh — exit 0
- [x] grep compliance — limpo
- [x] grep secrets — limpo

### Sessão 2026-08-07 — Planejamento: spec, Sprint-1 e decisões

**Tasks trabalhadas:** planejamento (nenhuma TASK de código)
**Status ao encerrar:** ✅ Concluída (planejamento)

**O que foi feito:**
- Trocado provider OpenAI → Claude/Anthropic em todo o `prd.md` (22 menções); "Structured Outputs" → "tool use".
- `spec.md` escrito: papel no barramento (bypass), arquitetura Clean Arch adaptada a NestJS, boundaries/ports, env vars, DoD.
- `Sprint-1.md` escrito: 6 TASKs Builder↔Evaluator (fundação sem IA), com critério de sucesso + evaluator executável cada.
- `Progress.md` reconstruído com estado real (esta reconstrução).

**Decisões:** D-01, D-02, D-03, D-04, D-05 (ver tabela).

**O que ficou pendente:**
- Nenhuma linha de código de feature ainda. Sprint-1 pronta para começar por TASK-01.
- Ativar no `quality-gate.md` §3 os patterns de isolamento de camada folder-scoped (estavam diferidos; agora a estrutura de pastas está definida em D-03) — fazer junto/antes de TASK-02.

**Próximo passo exato:**
> Iniciar TASK-01: criar `prisma/schema.prisma` (User, Chamado, enums Perfil/StatusChamado) + `PrismaService` + service `postgres` no docker-compose.

**Sensores rodados:**
- [ ] build — n/a (só docs)
- [ ] testes — n/a
- [ ] quality-gate — n/a (sem mudança de código)
- [x] grep secrets — limpo (docs sem segredo)

### Sessão 2026-08-07 — TASK-01 (Prisma) + TASK-02 (auth/RBAC)

**Tasks trabalhadas:** TASK-01, TASK-02
**Status ao encerrar:** ✅ Ambas concluídas (código); `prisma migrate dev` pendente de Docker (segunda)

**O que foi feito:**
- TASK-01 (`feat/prisma-schema`, mergeado em dev): schema.prisma (User, Chamado, enums), PrismaService global + teste, docker-compose (postgres:16-alpine), .env.example. Prisma fixado ^6 (D-06).
- TASK-02 (`feat/auth-rbac`, commit ae8d7cb): Clean Arch por camadas — domain/perfil puro (perfilAutorizado), LoginUseCase + ports, infra (bcrypt/jwt/prisma-query), PerfilGuard + @Perfis, POST /auth/login, ValidationPipe global. 14/14 testes.
- Baseline atualizado (coverage 50→50.45, largest_file 29→79) e registrado no histórico (quality-gate.md §9).

**Decisões:** D-06 (Prisma ^6).

**O que ficou pendente:**
- `docker compose up postgres` + `prisma migrate dev --name init` — só segunda (Docker bloqueado na máquina, equipe de suporte libera). Schema já validado via `prisma validate`.
- e2e reais de auth (login contra Postgres) — mesma dependência de Docker. Lógica coberta por unit test com mocks.
- Flag Jest no Sprint-1.md Evaluators: `--testPathPattern` → `--testPathPatterns` (Jest 30). Doc, pendente.

**Próximo passo exato:**
> Iniciar TASK-03 (admin cria usuário, RF-02) em branch `feat/crud-usuario` a partir de dev. Reusa PasswordHasher (TASK-02) e PerfilGuard(@Perfis ADMIN).

**Sensores rodados:**
- [x] build sem warnings
- [x] testes passando (14/14)
- [x] bash .harness/quality-gate.sh — exit 0
- [x] grep compliance — limpo (0)
- [x] grep secrets — limpo

### Sessão 2026-08-10 — Revisão DBA do schema + TASK-03 (CRUD usuário)

**Tasks trabalhadas:** revisão de schema (TASK-01), TASK-03
**Status ao encerrar:** ✅ TASK-03 concluída (`feat/crud-usuario`)

**O que foi feito:**
- Revisão DBA do `schema.prisma`: rename full-English snake_case via `@map`/`@@map`, `timestamptz(3)`, soft delete `deleted_at` em `users` e `tickets`. `prisma migrate dev` rodado (`20260810150304_init`). 4 arquivos TS de auth ajustados (`senhaHash`→`passwordHash`). D-07 registrada.
- TASK-03 (`feat/crud-usuario`): módulo `src/usuario/` espelhando auth — `CriarUsuarioUseCase` + `UsuarioRepository` port, `PrismaUsuarioRepository` (traduz `P2002`→`ConflictException` 409), `UsuarioController` `POST /usuarios` guard `@Perfis('ADMIN')`, DTO validado (email/senha≥8/perfil∈enum). Reuso de `PasswordHasher` (novo método `hash()`, aditivo) e `PerfilGuard` da TASK-02.
- Saída tipada `UsuarioCriado` sem `passwordHash` → senha nunca sai por estrutura. 21/21 testes; coverage 50.45→57.89.

**Decisões:** D-07 (schema full-English + soft delete + email não-reusa).

**O que ficou pendente:**
- e2e real de `POST /usuarios` (201 ADMIN / 403 CLIENTE / 401 sem token) contra Postgres — pende de Docker, como nas TASKs anteriores. Guard já coberto por unit (TASK-02).
- `.env` local tem `JWT_SECRET` literal — compliance-grep standalone acusa, mas arquivo é gitignored/não-trackeado; gate oficial não barra. Fora de escopo.

**Próximo passo exato:**
> Iniciar TASK-04 (cliente abre chamado, RF-03) em branch `feat/crud-chamado` a partir de dev.

**Sensores rodados:**
- [x] tsc --noEmit limpo
- [x] testes passando (21/21)
- [x] bash .harness/quality-gate.sh — exit 0
- [x] grep compliance — skip no gate (só `.env` local, não-trackeado)
- [x] grep secrets — limpo (nada trackeado)

### Sessão 2026-08-10 — Migração do standard Clean Architecture .NET → NestJS

**Tasks trabalhadas:** manutenção de harness (nenhuma TASK de código)
**Status ao encerrar:** ✅ Concluída (subido direto na dev)

**O que foi feito:**
- `standards/clean-architecture.md` confirmado v2.0 NestJS (folders em vez de `.csproj`, tabela "quem importa quem" TS, boundaries com ports Nest, escopo `src/**/domain/**`).
- `quality-gate.md §3`: bloco `clean_arch_nest` **ativado** no lugar do `ponytail:`/diferido (linhas 93-98). 4 patterns folder-scoped: domain sem `@nestjs/*`; domain+application sem `@prisma/client`/`bullmq`/`@anthropic-ai`/`jsonwebtoken`/`bcryptjs`; application sem `@nestjs/core`; sem `new Date`/`Date.now`/`Math.random`/`crypto.randomUUID` em domain+application.
- Removido o `ponytail:` (gatilho de upgrade cumprido — pastas de domínio já existem); rastro histórico preservado em D-03/D-08 e no comentário do bloco.
- Gate rodado: `clean_arch_nest` = 0 violações no código mergeado; único hit é `.env` local (JWT_SECRET, gitignored). Gate completo exit 0.

**Decisões:** D-08 (catraca de isolamento ativada; calibração application pode `@nestjs/common`).

**O que ficou pendente:**
- Nada desta migração. Próximo é TASK-04.

**Próximo passo exato:**
> Iniciar TASK-04 (cliente abre chamado, RF-03) em branch `feat/crud-chamado` a partir de dev.

**Sensores rodados:**
- [x] tsc — n/a (só docs de harness)
- [x] testes — n/a (sem mudança de código)
- [x] bash .harness/quality-gate.sh — exit 0
- [x] grep compliance — `clean_arch_nest` 0; só `.env` local não-trackeado
- [x] grep secrets — limpo (nada trackeado)

---

## Template para próximas sessões

Copiar e preencher ao encerrar a sessão:

```markdown
### Sessão YYYY-MM-DD — <RESUMO CURTO>

**Tasks trabalhadas:** TASK-XX, TASK-YY
**Status ao encerrar:** 🟡 Em progresso / ✅ Concluída

**O que foi feito:**
-

**Decisões:**
-

**O que ficou pendente:**
-

**Próximo passo exato:**
> (uma frase clara, sem ambiguidade)

**Sensores rodados:**
- [ ] build sem warnings
- [ ] testes passando
- [ ] bash .harness/quality-gate.sh — exit 0
- [ ] grep compliance — limpo
- [ ] grep secrets — limpo
```

---

## Próxima Sessão

**Começar em:** TASK-04 — cliente abre chamado (RF-03), branch `feat/crud-chamado` a partir de dev. `POST /chamados` (guard @Perfis CLIENTE): valida DTO (body), cria `Ticket` com `authorId` = `req.user.sub`, nasce `AWAITING_CLASSIFICATION` (D-05, sem IA na S1); persiste via repositório de infra.
**Contexto crítico:**
- TASK-01/02/03 concluídas. Migrate init aplicada. e2e contra Postgres pendentes de **Docker** — não bloqueia TASK-04..06 (tudo unit-testável com mocks).
- Padrão de módulo estabelecido em `src/auth/` e `src/usuario/`: espelhar em `src/chamado/`. `PerfilGuard` põe `req.user = { sub, perfil }` — o controller lê o autor daí.
- **Backlog (fora da Sprint-1):** documentar API via `@nestjs/swagger` (`SwaggerModule` em `/api`). Não pedido em nenhuma TASK; humano quer futuramente, não agora. Endpoints a documentar quando entrar: `POST /auth/login`, `POST /usuarios`, `POST /chamados`.
- Sprint-1 é **sem IA** (D-05). Não escrever nada de Claude/fila/atribuição — é Sprint-2.
- Clean Arch adaptado (D-03): módulo Nest por domínio, camadas por pasta. Domain puro (zero import de @nestjs/@prisma/@anthropic/bullmq). Padrão já estabelecido em `src/auth/` — espelhar em `src/usuario/`.
- Reuso: `PasswordHasher`/`BcryptPasswordHasher` e `PerfilGuard`+`@Perfis` já existem (TASK-02). AuthModule exporta o guard.
- Ativar patterns de isolamento folder-scoped no `quality-gate.md` §3 (`only_in: src/**/domain/**`) — diferido desde D-03, fazer em/antes de TASK-03.
- Provider de IA é **Claude** (D-01), só na Sprint-2.
- B-02: config de repo (Branch Protection + permissão Actions) é ação do humano.
- Cada TASK vira uma branch `feat/**` → gate → auto-PR pra dev → merge manual → auto-PR pra main → merge manual.
