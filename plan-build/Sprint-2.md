# Sprint-2 — IA, fila, atribuição e histórico

> Sprint estruturada no padrão **Builder ↔ Evaluator** (Anthropic): cada TASK tem uma entrega objetiva (Builder) e um critério de validação executável (Evaluator).

---

## Objetivo do Sprint

Plugar a inteligência no esqueleto da Sprint-1: o chamado que hoje nasce `AWAITING_CLASSIFICATION` e fica parado passa a ser **enfileirado, classificado pela IA (Claude), atribuído ao funcionário de menor carga e movido para `OPEN`** — sem bloquear o cliente. Quando a IA falha, o chamado cai para **classificação manual** sem travar. O funcionário **revisa/reclassifica**, e cada passo relevante vira **evento imutável** na trilha de auditoria.

Ao fim: o fluxo `abrir → fila → Claude → atribuir → OPEN → funcionário revisa → EM_ATENDIMENTO → RESOLVIDO` roda ponta a ponta, com tolerância a falha e histórico append-only.

---

## O que NÃO entra neste sprint

- **Endpoint/relatório de concordância IA × humano** — o PRD (§4) é explícito: v1 **não** expõe. A métrica é agregação em tempo de leitura sobre dados que já existem (original vs final). Fora de escopo.
- **Fine-tuning / re-treino a partir do histórico** — v1 só **registra** o dataset (RF-11); não retroalimenta o modelo.
- **Edição do resumo da IA** — `resumo` é read-only (RF-04).
- **Gestão completa de usuário** (editar/desativar/excluir) — RF-02 só cria; sustenta a premissa "sempre há funcionário" (RF-07).
- **Múltiplos workers / atribuição atômica sob concorrência real** — v1 é worker único sequencial (RF-06). Seleção+persistência atômica fica para evolução futura.
- **Documentação Swagger** — backlog fora de sprint (humano quer futuramente).

---

## Bloqueios e dependências externas

| # | Item | Impacto | Ação |
|---|---|---|---|
| B-01 | Anexo A do PRD (matriz de taxonomia) `[ABERTO]` | Afeta só a **correção semântica** da classificação (RF-04), **não** o código. Sem a matriz, a concordância mede consistência, não acerto. | Stakeholder. **NÃO bloqueia** codar a Sprint-2. |
| B-02 | Config de repo (Branch Protection + permissão Actions) + **Redis service no CI** | TASK-09 adiciona Redis ao `docker-compose` e ao `quality-gate.yml`. | Ação do humano (UI GitHub / revisão do workflow). |
| KEY | `ANTHROPIC_API_KEY` no `.env` local | Necessária só para rodar o fluxo real / e2e opt-in na **TASK-10**. Nunca no repo, nunca no chat. | Humano põe no `.env` local **quando a TASK-10 começar** — o agente avisa. |

---

## Decisões que esta sprint aciona

| Ref | Decisão | Quando | Quem decide |
|---|---|---|---|
| D-01 | Provider = Claude/Anthropic, **tool use** (JSON Schema via `tool_choice` forçado) | TASK-10 | já decidida |
| D-02 | Fila = BullMQ + Redis, worker in-process concurrency **1** | TASK-09 | já decidida |
| **nova** | Modelagem original-vs-final da classificação: colunas `original_*`/`final_*` no `Ticket` **vs** tabela `Classificacao` dedicada | TASK-07 | **squad-vote** (técnica) |
| **nova** | Teste da chamada real ao Claude = **mock + e2e real opt-in** (e2e bate na Anthropic só se `ANTHROPIC_API_KEY` no ambiente; pulado senão) | TASK-10 | decidida pelo humano (2026-08-11) |

---

## Onde a IA é chamada de verdade

**Só na TASK-10** (`ClaudeClassificadorGateway`). É o único ponto que instancia `@anthropic-ai/sdk` e faz o request. Todo o resto usa o **port** `ClassificadorGateway`:
- **TASK-09** roda a fila inteira com um gateway **fake** (retorno fixo, zero API).
- **TASK-10** pluga o gateway real; teste unitário usa **mock do SDK** (não gasta key).
- A key só é exercitada no e2e opt-in (rodado à mão) e no fluxo manual ponta-a-ponta.

---

## Contrato Builder ↔ Evaluator

### TASK-07 — Modelo de dados da classificação + histórico (schema)

**Critério de sucesso (declare ANTES de codar):**
> `npx prisma migrate dev` adiciona ao `Ticket` os campos de classificação (original imutável + final) e o flag `classificacao_manual_pendente`, cria o model `TicketEvent` (histórico append-only) e os enums `Categoria/Prioridade/Area/Sentimento/TicketEventType`; `prisma validate` passa e o client tipado gera sem erro.

**Diff esperado:**
- `prisma/schema.prisma` (novos enums + campos no `Ticket` + model `TicketEvent`), `prisma/migrations/**` (gerado).
- Tamanho estimado: ~90 linhas de schema.

**Fora do escopo desta TASK:**
- Nenhuma lógica de negócio, nenhum endpoint. Só schema + migração + client.

**Builder entrega:**
- Enums: `Categoria { PROBLEMA_TECNICO, DUVIDA, RECLAMACAO, SOLICITACAO, OUTROS }`, `Prioridade { BAIXA, MEDIA, ALTA, CRITICA }`, `Area { ENGENHARIA, QUALIDADE, LOGISTICA, COMERCIAL, SUPORTE_TECNICO, OUTROS }`, `Sentimento { POSITIVO, NEUTRO, NEGATIVO, FRUSTRADO }`.
- `TicketEventType { CLASSIFICACAO_IA, FALHA_CLASSIFICACAO, RECLASSIFICACAO, ATRIBUICAO, MUDANCA_STATUS }`.
- **Classificação original da IA (imutável)** e **classificação final** (editável pelo funcionário) — a modelagem exata (colunas no `Ticket` vs tabela `Classificacao`) sai do **squad-vote** desta TASK. `resumo` (máx 300 char) e `modelo/versão` da IA acompanham a original.
- Flag `classificacao_manual_pendente Boolean @default(false)` no `Ticket`.
- `TicketEvent`: `id`, `ticketId` (FK), `type` (enum), `payload Json` (campos do evento — antes→depois, autor, tentativa, critério, etc.), `authorId Int?` ("sistema" = null), `createdAt @db.Timestamptz(3)`. Append-only (sem update/delete no repo — TASK-08). `@@index([ticketId, createdAt])`.
- Constraint: nada de `console.*`; original da IA marcada como imutável no domínio (TASK-11/13 respeitam).

**Evaluator valida:**
```bash
docker compose up -d postgres
npx prisma migrate dev --name classificacao_historico
npx prisma validate
npx prisma generate
```

**Critério de aceite:** ✅ CONCLUÍDA (`feat/schema-classificacao-historico`, migração `20260811203041_classificacao_historico`)
- [x] Migração aplica limpa; `prisma validate` passa; client gera.
- [x] `squad-vote` da modelagem original-vs-final registrado em `runs/decisions/` (2026-08-11_001 → opção A, unânime).
- [x] Nada fora do "Diff esperado" foi tocado.

---

### TASK-08 — Histórico do chamado (RF-11)

**Critério de sucesso (declare ANTES de codar):**
> Existe um gravador de evento injetável que persiste `TicketEvent` append-only; `GET /chamados/:id/historico` devolve os eventos em ordem cronológica — **admin** vê tudo, **funcionário** vê só chamado atribuído a ele (403 senão), com visão restrita (original da IA + próprias reclassificações). As transições de status já existentes (TASK-05) passam a gravar `MUDANCA_STATUS`.

**Diff esperado:**
- Módulo `src/historico/`: `domain/` (tipos de evento), `application/` (`RegistrarEventoUseCase` + port `HistoricoRepository`, `ListarHistoricoUseCase`), `infrastructure/PrismaHistoricoRepository` (append-only — só `create`/`findMany`), `historico.controller.ts` (`GET /chamados/:id/historico`), `historico.module.ts`.
- `src/chamado/application/mudar-status.usecase.ts` — grava `MUDANCA_STATUS` (antes→depois, autor) ao transitar.
- Tamanho estimado: ~180 linhas.

**Fora do escopo desta TASK:**
- Eventos de IA/atribuição/reclassificação (gerados nas TASKs 11/12/13) — aqui só a **infra de gravar/ler** + o evento de status que já dá pra emitir.

**Builder entrega:**
- `RegistrarEventoUseCase.executar(ticketId, type, payload, authorId?)` — porta única que as próximas TASKs reusam (nunca duplicar gravação).
- Repo **append-only**: sem método de update/delete de evento (imutabilidade RF-11 garantida por ausência de caminho).
- `GET /chamados/:id/historico` guard `@Perfis('ADMIN','FUNCIONARIO')`: admin → todos os eventos; funcionário → 403 se não for o `assigneeId`, senão visão restrita (original IA + `RECLASSIFICACAO` dele).
- Constraint: anti-IDOR no funcionário (filtra por `assigneeId == req.user.sub`, nunca por query).

**Evaluator valida:**
```bash
npx jest --testPathPatterns=historico
# unit: grava evento; lista cronológica; funcionário não-atribuído → 403; admin vê tudo
```

**Critério de aceite:**
- [ ] Evento nunca é atualizado/apagado (só create/read).
- [ ] Autorização: funcionário só vê histórico de chamado atribuído a ele (IDOR → 403).
- [ ] `MUDANCA_STATUS` gravado nas transições existentes; cobertura não caiu; lint limpo.

---

### TASK-09 — Fila + worker sequencial (RF-06), gateway fake

**Critério de sucesso (declare ANTES de codar):**
> Abrir um chamado enfileira um job; um worker **sequencial** (concurrency 1) o processa via um `ClassificadorGateway` **fake** (retorno fixo, sem API). O processamento é **idempotente por `ticketId`** e **reconfirma elegibilidade** antes de persistir (descarta se `CANCELLED`). A resposta HTTP da abertura **não** espera o worker.

**Diff esperado:**
- `docker-compose.yml` (service `redis`), `.env.example` (`REDIS_URL`), `.github/workflows/quality-gate.yml` (service `redis` no job).
- Módulo `src/classificacao/`: port `FilaClassificacao` + `ClassificadorGateway` (interface), `infrastructure/BullmqFilaClassificacao`, `classificacao.worker.ts` (processor concurrency 1), `FakeClassificadorGateway` (provisório, retorno fixo), `classificacao.module.ts`.
- `src/chamado/application/abrir-chamado.usecase.ts` — enfileira após persistir.
- Tamanho estimado: ~220 linhas.

**Fora do escopo desta TASK:**
- Chamada real ao Claude (TASK-10). Atribuição por carga (TASK-11). Retry/falha (TASK-12). O worker aqui só prova **sequência + idempotência + elegibilidade** com gateway fake.

**Builder entrega:**
- BullMQ concurrency **1** (serializa — RF-06). `REDIS_URL` obrigatória (Sprint-2).
- Idempotência por `ticketId` (job já concluído não reclassifica); worker relê o ticket e **descarta** se não estiver `AWAITING_CLASSIFICATION` (cancelado durante processamento, RF-06/RF-09).
- Abertura persiste `AWAITING_CLASSIFICATION` **e** enfileira; HTTP retorna sem esperar (contrato RF-06 mantido da TASK-04).
- Constraint: `classificacao/domain` e `application` **sem** `bullmq`/`@anthropic-ai` (D-08 — só na infra). `FakeClassificadorGateway` marcado `ponytail:` (removido na TASK-10).

**Evaluator valida:**
```bash
docker compose up -d postgres redis
npx jest --testPathPatterns=classificacao
npm run test:e2e -- --testPathPatterns=classificacao
# e2e: abrir → job enfileirado; worker processa 1x; reprocesso não duplica; cancelado descarta
```

**Critério de aceite:**
- [ ] Worker sequencial; idempotente por `ticketId`; descarta cancelado.
- [ ] Redis no docker-compose e no CI; `REDIS_URL` documentada.
- [ ] Camadas isoladas (compliance-grep `clean_arch_nest` = 0).

---

### TASK-10 — Gateway Claude real (RF-04)

**Critério de sucesso (declare ANTES de codar):**
> `ClaudeClassificadorGateway` chama a API da Anthropic via **tool use** (JSON Schema com os enums, `tool_choice` forçado) e devolve os 4 campos + `resumo` validados dentro dos enums (rede de segurança no backend). O texto do cliente é tratado como **dado não confiável** — instruções nele não alteram schema/prompt. Substitui o fake da TASK-09.

**Diff esperado:**
- `src/classificacao/infrastructure/ClaudeClassificadorGateway.ts` (usa `@anthropic-ai/sdk`), `.env.example` (`ANTHROPIC_API_KEY`, `ANTHROPIC_TIMEOUT_MS`), binding no `classificacao.module.ts` (troca fake → real).
- `src/classificacao/domain/` — validação de enum (rede de segurança) pura.
- Tamanho estimado: ~160 linhas.

**Fora do escopo desta TASK:**
- Retry/timeout/falha (TASK-12) — aqui a chamada é o caminho feliz; erro sobe para a TASK-12 tratar.
- Atribuição e transição (TASK-11).

**Builder entrega:**
- tool use: tool com input schema dos 4 enums + `resumo` (máx 300 char); `tool_choice` forçado no tool. Modelo Claude mais capaz atual.
- Texto do cliente entra como **conteúdo** (bloco de dado), separado do system prompt — anti prompt-injection (RF-04).
- Validação backend: cada campo reconferido no enum; valor fora → erro (a TASK-12 trata como falha).
- **Teste = mock + e2e real opt-in**: unit com mock do SDK (não gasta key); e2e que bate na Anthropic **só roda se `ANTHROPIC_API_KEY` presente** no ambiente (`describe.skip` / guard senão).
- Constraint: `ANTHROPIC_API_KEY` só do `.env`/env var, nunca hardcoded (compliance-grep secrets).

**Evaluator valida:**
```bash
npx jest --testPathPatterns=classificacao   # mock, sempre roda
# e2e real (opt-in): ANTHROPIC_API_KEY=... npm run test:e2e -- --testPathPatterns=claude
```

**Critério de aceite:**
- [ ] Retorno validado nos enums; `resumo` ≤ 300 char.
- [ ] Prompt-injection: texto malicioso do cliente não altera a saída estrutural (teste com mock).
- [ ] Key nunca no repo; e2e real pulado sem a key; lint/cobertura ok.

---

### TASK-11 — Caminho feliz da fila: classifica → atribui → OPEN (RF-04 + RF-07)

**Critério de sucesso (declare ANTES de codar):**
> Processado um chamado elegível, o worker classifica (TASK-10), **atribui ao funcionário de menor carga** (chamados ativos ∉ {RESOLVED, CANCELLED}; desempate por **menor id**), transita `AWAITING_CLASSIFICATION → OPEN` e grava os eventos `CLASSIFICACAO_IA`, `ATRIBUICAO` e `MUDANCA_STATUS(autor=sistema)`.

**Diff esperado:**
- `src/classificacao/application/` — `ClassificarChamadoUseCase` (orquestra gateway → salva original+final → atribui → transita → grava eventos). Port `SelecionarFuncionarioMenorCarga` (ou query no repo).
- `src/classificacao/domain/atribuicao.ts` — regra pura de menor carga + desempate por id.
- `classificacao.worker.ts` — passa a chamar o use case real.
- Tamanho estimado: ~200 linhas.

**Fora do escopo desta TASK:**
- Falha/retry (TASK-12). Reclassificação (TASK-13).

**Builder entrega:**
- Atribuição **antes** da transição (faz parte da saída da fila — RF-07). Contagem de carga: tickets do funcionário com status ∉ {RESOLVED, CANCELLED} (inclui AWAITING com manual pendente).
- Original da IA persistida **imutável**; final inicia = original.
- 3 eventos gravados via `RegistrarEventoUseCase` (TASK-08) — sem duplicar lógica de histórico.
- Constraint: regra de menor carga é **domínio puro** (testável sem banco); a query de contagem fica na infra.

**Evaluator valida:**
```bash
docker compose up -d postgres redis
npx jest --testPathPatterns=classificacao
npm run test:e2e -- --testPathPatterns=classificacao
# e2e (gateway mock/fake determinístico): abrir → após processar, ticket OPEN + assigneeId setado + 3 eventos
```

**Critério de aceite:**
- [ ] Menor carga com desempate por id (teste de domínio cobre empate).
- [ ] `AWAITING → OPEN` só após atribuir; original imutável preservada.
- [ ] Eventos `CLASSIFICACAO_IA`/`ATRIBUICAO`/`MUDANCA_STATUS` gravados.

---

### TASK-12 — Tolerância a falha da IA (RF-05)

**Critério de sucesso (declare ANTES de codar):**
> Falha **transitória** (timeout / 429 / 5xx / valor fora do enum) → **1 retry**. Falha **não transitória** (401/403) → **sem retry**. Esgotado, o chamado **permanece `AWAITING_CLASSIFICATION`**, recebe `classificacao_manual_pendente = true`, é **atribuído mesmo assim** (RF-07) e grava `FALHA_CLASSIFICACAO`. A criação do chamado nunca é impedida pela falha.

**Diff esperado:**
- `src/classificacao/application/ClassificarChamadoUseCase` — envolve a chamada com timeout + política de retry (classifica erro transitório vs não).
- `.env` (`ANTHROPIC_TIMEOUT_MS`), já em `.env.example` na TASK-10.
- `src/classificacao/domain/politica-retry.ts` — pura: dado o tipo de erro, decide retry sim/não.
- Tamanho estimado: ~140 linhas.

**Fora do escopo desta TASK:**
- A classificação manual em si é a TASK-13 (funcionário preenche). Aqui só o **fallback**: marcar pendente + atribuir + logar.

**Builder entrega:**
- Timeout configurável conta como transitório. Retry único. 401/403 direto para manual (log operacional via Logger do Nest, não `console`).
- Fallback: flag `manual_pendente=true`, atribui por menor carga (reusa TASK-11), grava `FALHA_CLASSIFICACAO` (motivo, tentativa). Chamado **não** transita para OPEN (fica AWAITING — RF-05/RF-09).
- Constraint: política de retry é **domínio puro**; a chamada com timeout fica na aplicação/infra.

**Evaluator valida:**
```bash
npx jest --testPathPatterns=classificacao
# unit (mock do gateway lançando 429/timeout/401): 429 → 1 retry; 401 → 0 retry;
# esgotado → AWAITING + manual_pendente=true + assigneeId setado + evento FALHA_CLASSIFICACAO
```

**Critério de aceite:**
- [ ] Transitório = 1 retry; não transitório = 0 retry (teste por tipo de erro).
- [ ] Esgotado: fica AWAITING, `manual_pendente=true`, atribuído, `FALHA_CLASSIFICACAO` gravado.
- [ ] Falha da IA nunca elimina/invalida o chamado.

---

### TASK-13 — Funcionário revisa e reclassifica (RF-08)

**Critério de sucesso (declare ANTES de codar):**
> O funcionário atribuído revisa/reclassifica um chamado (`PATCH /chamados/:id/classificacao`): altera campos dentro dos enums, a **final** é atualizada, a **original da IA é preservada**, e cada alteração vira evento `RECLASSIFICACAO` (campo, antes→depois, autor). Chamado sem classificação da IA (caminho manual, RF-05) é classificado do zero e, ao salvar, move `AWAITING → OPEN`. Funcionário não-atribuído → 403. Não pode ir a `IN_PROGRESS` sem classificação final válida.

**Diff esperado:**
- `src/chamado/application/ReclassificarUseCase` (ou módulo `classificacao`) — valida enum, diff campo-a-campo, grava evento por alteração, transita AWAITING→OPEN se era manual pendente.
- `chamado.controller.ts` — `PATCH /chamados/:id/classificacao` guard `@Perfis('FUNCIONARIO')`, checa `assigneeId == sub`.
- `src/chamado/application/mudar-status.usecase.ts` — bloqueia `→ IN_PROGRESS` se final inválida.
- Tamanho estimado: ~200 linhas.

**Fora do escopo desta TASK:**
- Nada novo de IA. Fecha o loop humano-no-loop da Sprint-2.

**Builder entrega:**
- Autorização: só o funcionário **atribuído** opera (visualizar/classificar/reclassificar/status). Outro → 403 (anti-IDOR, reforça RF-08).
- Original imutável preservada; final atualizada. Um evento `RECLASSIFICACAO` **por campo alterado** (não um agregado).
- Manual pendente: ao salvar classificação válida, `manual_pendente=false` e `AWAITING → OPEN` (via mesma máquina de estados, gravando `MUDANCA_STATUS`).
- Guarda: `→ IN_PROGRESS` exige final válida nos 4 campos (sinal de "revisado" — RF-08/§4).
- Constraint: reuso de `RegistrarEventoUseCase` e da máquina de estados; sem duplicar transição.

**Evaluator valida:**
```bash
docker compose up -d postgres
npx jest --testPathPatterns=chamado
npm run test:e2e -- --testPathPatterns=chamado
# e2e: funcionário atribuído reclassifica → final muda, original intacta, evento por campo;
#      não-atribuído → 403; manual pendente salvo → OPEN; IN_PROGRESS sem classificação → rejeitado
```

**Critério de aceite:**
- [ ] Original preservada; final atualizada; um `RECLASSIFICACAO` por campo.
- [ ] Funcionário não-atribuído → 403; manual pendente salvo move para OPEN.
- [ ] Bloqueio de `IN_PROGRESS` sem classificação final; cobertura não caiu.

---

## Sensores obrigatórios ao fim do sprint

```bash
# 1) Build limpo
npm run build

# 2) Testes (unit + e2e)
npm test
docker compose up -d postgres redis && npm run test:e2e

# 3) Quality Gate
bash .harness/quality-gate.sh

# 4) Compliance grep (isolado) — isolamento de camada + secrets
bash .harness/collectors/compliance-grep.sh

# 5) Sem secrets (ANTHROPIC_API_KEY / REDIS_URL nunca commitados)
git diff origin/main -- '*.env*' '*.json' '*.yml' | grep -iE 'anthropic|api[_-]?key|token|secret|password' || true
```

---

## Critério de aceite do sprint

- [ ] TASK-07..13 com status ✅ no `Progress.md`.
- [ ] `bash .harness/quality-gate.sh` exit 0.
- [ ] Fluxo ponta-a-ponta verde: abrir → fila → classificar (mock/real) → atribuir → OPEN → reclassificar → EM_ATENDIMENTO → RESOLVIDO.
- [ ] Tolerância a falha (RF-05) testada: IA falha → chamado não trava, cai para manual.
- [ ] Histórico append-only íntegro (RF-11): eventos nunca editados/apagados.
- [ ] PR de cada TASK mergeado em `main` (via dev, GitFlow do CI).
- [ ] `Progress.md` atualizado com fechamento de sprint.
- [ ] Baseline atualizado se cobertura melhorou.
