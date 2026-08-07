# spec.md — Classificador Inteligente de Chamados

> Documento vivo de produto e arquitetura. Atualizar quando uma decisão de produto ou arquitetural mudar.
> Esta é a fonte da verdade que `/harness` consulta para entender o "porquê" do projeto.
>
> Produto detalhado em `prd.md` (raiz). Este spec traduz o PRD em **arquitetura executável**.

---

## 0. Papel deste projeto no Barramento

> Ver `plan-build/standards/barramento-worker.md`.

- **Papel:** **Nenhum.** Este projeto **não é** um worker NATS do Barramento BSN. É um backend REST NestJS standalone (trilha de onboarding).
- **Bypass de `barramento-worker.md`:** legítimo — o próprio standard exclui "Adaptadores REST síncronos" e "Workers que não vão pro barramento BSN". Nenhum acoplamento a NATS/gRPC/Shared se aplica.
- **Bordas externas (gRPC):** nenhuma.
- **Bordas externas (REST):** API REST própria (auth + chamados + usuários), consumida pelo frontend Next.js (fora deste repo).
- **Tópicos NATS pub/sub:** nenhum. A fila interna de classificação usa **BullMQ + Redis** (ver §3), não NATS.
- **Persistência:** PostgreSQL via Prisma.

---

## 1. Visão do produto

- **O que é:** backend de um sistema que recebe chamados em texto livre e usa IA (Claude) para classificá-los (categoria, área, prioridade, sentimento, resumo), atribuindo automaticamente ao funcionário de menor carga.
- **Por que existe:** eliminar a triagem manual inicial de chamados. Dor é hipótese de portfólio (ver `prd.md` §2).
- **Quem usa:** Cliente (abre/acompanha chamados), Funcionário (revisa/reclassifica/resolve), Admin (cria usuários, cancela chamados).
- **Valor central (uma frase):** classificar chamado por IA sem bloquear o cliente, mantendo humano no loop para corrigir.

---

## 2. Microsserviços / Componentes

> Serviço único (monolito modular NestJS). Não há microsserviços — single-instance por decisão de escopo (`prd.md` §6).

### `trilha-invista-backend`

- **Responsabilidade:** expor a API REST e rodar o worker de classificação in-process.
- **Fluxo:** `cliente abre chamado (HTTP) → persiste AGUARDANDO_CLASSIFICACAO → enfileira (BullMQ) → worker chama Claude → classifica + atribui → ABERTO → funcionário revisa`.
- **Componentes internos (módulos Nest, 1 por domínio):**
  - `auth` — login, guard de perfil (RF-01).
  - `usuario` — admin cria usuário (RF-02).
  - `chamado` — abrir, listar, ciclo de status, reclassificar (RF-03, RF-08, RF-09, RF-10).
  - `classificacao` — fila + worker + gateway Claude + atribuição (RF-04, RF-05, RF-06, RF-07). **Sprint-2.**
  - `historico` — log de eventos append-only (RF-11). **Sprint-2.**
- **Bloqueios ativos:** Anexo A do PRD (matriz de taxonomia) — bloqueia a **correção semântica** da classificação (RF-04), não o código. Decisão de stakeholder.

---

## 3. Arquitetura

- **Padrão arquitetural:** **Clean Architecture** — obrigatório por default. Ver `plan-build/standards/clean-architecture.md`.
  - **Adaptação .NET → NestJS** (o standard é escrito para .NET com 4 `.csproj`; aqui não há projetos separados). Mapeamento:

    | Camada (standard) | Aqui (NestJS) | Regra de dependência |
    |---|---|---|
    | Domain (Entities) | `src/<dominio>/domain/` | só ela mesma + stdlib. **Zero** import de `@nestjs/*`, `@prisma/*`, `@anthropic-ai/*`, `bullmq` |
    | Application (Use Cases) | `src/<dominio>/application/` (+ `ports/` = interfaces) | importa só `domain/`. Sem framework, sem I/O concreto |
    | Interface Adapters | `src/<dominio>/*.controller.ts` + `infrastructure/*.repo.ts` | conhece application + domain |
    | Frameworks & Drivers | `*.module.ts`, Prisma client, gateway Claude, BullMQ | borda externa |

  - **Screaming Architecture:** a raiz de `src/` grita o domínio (`auth/`, `usuario/`, `chamado/`, `classificacao/`, `historico/`), não o framework.
  - **Boundaries** (dependência externa → interface na application, implementação na infrastructure):

    | Dependência externa | Port (interface) | Implementação |
    |---|---|---|
    | Banco | `ChamadoRepository` etc. | `PrismaChamadoRepository` |
    | Relógio | `Clock` | `SystemClock` |
    | Classificador IA | `ClassificadorGateway` | `ClaudeClassificadorGateway` (Sprint-2) |
    | Fila | `FilaClassificacao` | `BullmqFilaClassificacao` (Sprint-2) |

  - **Isolamento verificado por compliance-grep** folder-scoped (`only_in: src/**/domain/**` e `src/**/application/**`) — ver `quality-gate.md` §3. Ativado agora que a estrutura de pastas está definida.
- **Padrões de código:** **Clean Code** — obrigatório por default. Ver `plan-build/standards/clean-code.md`.
- **Padrões de comunicação:**
  - **Síncrono REST** — cliente ↔ backend.
  - **Assíncrono via fila** — abertura de chamado → classificação (BullMQ/Redis). A resposta HTTP nunca espera a IA (RF-06).
- **Modelo de dados:**
  - **Banco:** PostgreSQL.
  - **ORM/Driver:** Prisma.
  - **Migrations:** Prisma Migrate.
- **Autenticação/Autorização:** JWT (login retorna token); RBAC por perfil (Cliente/Funcionário/Admin) via guard no backend. Cliente vê só os próprios chamados; funcionário opera só chamados atribuídos a ele (proteção contra IDOR → 403).
- **Observabilidade:** Logger do Nest (JSON estruturado). Log de falha de classificação e de rate limit (RF-05, `prd.md` §7). Sem `console.*` (compliance-grep).

---

## 4. Regras transversais

- **Stack declarada:** TypeScript 5.7 + NestJS 11 sobre Node 20+. Prisma (Postgres). BullMQ + Redis (fila). `@anthropic-ai/sdk` (classificação, Sprint-2). Jest (ts-jest).
- **Padrões proibidos (compliance-grep):** ver `plan-build/quality-gate.md` §3.
- **Secrets:** sempre via `.env` (não commitado) ou env var no CI. Nunca hardcoded. `ANTHROPIC_API_KEY` fora do repo e do frontend.
- **Logs:** estruturados via Logger do Nest, nunca `console.log` cru.
- **Tratamento de erro:** `HttpException` do Nest ou exception de domínio específica, nunca `throw new Error(...)` genérico nem `catch` vazio.
- **Idempotência:** worker de classificação idempotente por `chamado_id`; reconfirma elegibilidade antes de persistir (RF-06).
- **Entrada não confiável:** texto do chamado é conteúdo a classificar, nunca instrução ao modelo (defesa contra prompt injection, RF-04).
- **CNPJ:** **não aplicável** — o produto não valida/recebe/persiste CNPJ. Bloco `cnpj_alfanumerico` do `quality-gate.md` §3 permanece inerte.

---

## 5. Definition of Done

Uma TASK só está pronta quando TODOS os itens abaixo são verdadeiros:

- [ ] Build limpo, sem warnings.
- [ ] Testes da área tocada passando.
- [ ] `bash .harness/quality-gate.sh` retorna exit 0.
- [ ] Reviewers automáticos (CI + LLM) sem comentários abertos.
- [ ] Todas as conversations do PR resolvidas.
- [ ] `plan-build/Progress.md` atualizado com a sessão.
- [ ] Sem secrets, sem placeholders esquecidos, sem `TODO` deixado pra trás.

---

## 6. Variáveis de ambiente

| Variável | O que é | Obrigatória? | Onde usada |
|---|---|---|---|
| `DATABASE_URL` | Connection string do Postgres | sim | Prisma |
| `JWT_SECRET` | Segredo de assinatura do token | sim | `auth` |
| `PORT` | Porta HTTP (default 3000) | não | `main.ts` |
| `REDIS_URL` | Connection string do Redis (fila) | sim (Sprint-2) | `classificacao` (BullMQ) |
| `ANTHROPIC_API_KEY` | Chave da API Anthropic/Claude | sim (Sprint-2) | `classificacao` (gateway) |
| `ANTHROPIC_TIMEOUT_MS` | Timeout por chamada ao Claude | não | `classificacao` (RF-05) |

Arquivo de exemplo: `.env.example` na raiz do repositório.
