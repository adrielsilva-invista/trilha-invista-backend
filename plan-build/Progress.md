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
TASK-01 | [░░░░░░░░░░] | Modelo de dados (Prisma + Postgres)        | 🔴 PENDENTE
TASK-02 | [░░░░░░░░░░] | Autenticação e RBAC (RF-01)                | 🔴 PENDENTE
TASK-03 | [░░░░░░░░░░] | Admin cria usuário (RF-02)                 | 🔴 PENDENTE
TASK-04 | [░░░░░░░░░░] | Cliente abre chamado (RF-03)               | 🔴 PENDENTE
TASK-05 | [░░░░░░░░░░] | Máquina de estados do chamado (RF-09)      | 🔴 PENDENTE
TASK-06 | [░░░░░░░░░░] | Cliente acompanha seus chamados (RF-10)    | 🔴 PENDENTE
```

Progresso geral: 0/6 TASKs (0%)

**Resultado dos testes:**
```
—  | 0/0 | ainda não há testes de feature
```
**Build:** — (scaffold NestJS compila)
**bash .harness/quality-gate.sh:** exit 0 (baseline de setup: coverage 50 / dup 0 / lint 0 / maior arquivo 29 / compliance 0)

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

**Começar em:** TASK-01 — modelo de dados Prisma (User, Chamado, enums Perfil/StatusChamado) + PrismaService + service `postgres` no docker-compose. Antes de codar, ativar os patterns de isolamento de camada no `quality-gate.md` §3 (folder-scoped `only_in: src/**/domain/**`, `src/**/application/**`), conforme D-03.
**Contexto crítico:**
- Sprint-1 é **sem IA** (D-05). Não escrever nada de Claude/fila/atribuição — é Sprint-2.
- Clean Arch adaptado (D-03): módulo Nest por domínio, camadas por pasta. Domain puro (zero import de @nestjs/@prisma/@anthropic/bullmq).
- Provider de IA é **Claude** (D-01), relevante só na Sprint-2.
- B-02: config de repo (Branch Protection + permissão Actions) é ação do humano — o "não mergeia se falhar" depende disso.
- Cada TASK vira uma branch `feat/**` → gate → auto-PR pra dev → merge manual → auto-PR pra main → merge manual.
