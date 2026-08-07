# Sprint-1 — Fundação: auth, usuários e ciclo de vida do chamado (sem IA)

> Sprint estruturada no padrão **Builder ↔ Evaluator** (Anthropic): cada TASK tem uma entrega objetiva (Builder) e um critério de validação executável (Evaluator).

---

## Objetivo do Sprint

Entregar o esqueleto autenticado do produto: login com RBAC, admin cria usuários, cliente abre e lista chamados, e a máquina de estados do chamado — **sem nenhuma integração de IA**. Ao fim, existe um CRUD autenticado com regras de domínio testadas, pronto para a Sprint-2 plugar a classificação.

---

## O que NÃO entra neste sprint

- Classificação por IA / gateway Claude (RF-04) — Sprint-2.
- Fila BullMQ/Redis + worker (RF-06) — Sprint-2.
- Atribuição automática por carga (RF-07) — Sprint-2.
- Reclassificação pelo funcionário (RF-08) — Sprint-2.
- Histórico de eventos append-only (RF-11) — Sprint-2.
- Tolerância a falha da IA (RF-05) — Sprint-2.

> Consequência aceita: um chamado criado nesta sprint nasce `AGUARDANDO_CLASSIFICACAO` e **fica parado** — nada o move para `ABERTO` ainda (isso é disparado pela classificação, RF-04, na Sprint-2). A máquina de estados e suas regras existem e são testadas; o gatilho automático vem depois.

---

## Status de bloqueios

| # | Bloqueio | Componente | Impacto | Status |
|---|---|---|---|---|
| — | Nenhum bloqueia a Sprint-1 | — | Anexo A afeta só RF-04 (Sprint-2) | — |

---

## Contrato Builder ↔ Evaluator

### TASK-01 — Modelo de dados (Prisma + Postgres)

**Critério de sucesso (declare ANTES de codar):**
> `npx prisma migrate dev` cria as tabelas `User` e `Chamado` com os enums de perfil e status; `npx prisma generate` produz o client tipado sem erro.

**Diff esperado:**
- `prisma/schema.prisma` (novo), `prisma/migrations/**` (gerado), `.env.example` (`DATABASE_URL`), `docker-compose.yml` (service `postgres`).
- Módulo `src/prisma/` (PrismaService + module).
- Tamanho estimado: ~120 linhas.

**Fora do escopo desta TASK:**
- Nenhum endpoint. Só schema + client + conexão.
- Tabelas de histórico/eventos (RF-11) — Sprint-2.

**Builder entrega:**
- `schema.prisma` com: `User` (id, email único, senhaHash, perfil), `Chamado` (id, texto, status, clienteId, funcionarioId nullable, timestamps), enums `Perfil { CLIENTE, FUNCIONARIO, ADMIN }` e `StatusChamado { AGUARDANDO_CLASSIFICACAO, ABERTO, EM_ATENDIMENTO, RESOLVIDO, CANCELADO }`.
- `PrismaService` (onModuleInit → `$connect`), sem regra de negócio.
- Constraint: nenhum `console.*`; senha nunca em claro no schema (campo é `senhaHash`).

**Evaluator valida:**
```bash
docker compose up -d postgres
npx prisma migrate dev --name init
npx prisma generate
npx prisma validate
```

**Critério de aceite:**
- [ ] `prisma validate` passa; migration aplicada.
- [ ] Client gerado, `PrismaService` conecta no boot.
- [ ] Nada fora do "Diff esperado" foi tocado.

---

### TASK-02 — Autenticação e RBAC (RF-01)

**Critério de sucesso (declare ANTES de codar):**
> `POST /auth/login` com credencial válida retorna 200 + JWT; credencial inválida retorna 401. Uma rota protegida por perfil retorna 403 quando o perfil do token não bate.

**Diff esperado:**
- Módulo `src/auth/` — `domain/` (regra de senha/token abstrata), `application/` (LoginUseCase + ports), `infrastructure/` (bcrypt hasher, jwt signer), `auth.controller.ts`, guard `PerfilGuard` + decorator `@Perfis(...)`.
- `.env.example` (`JWT_SECRET`).
- Tamanho estimado: ~200 linhas.

**Fora do escopo desta TASK:**
- Registro de usuário (é RF-02, TASK-03).
- Refresh token, logout, expiração configurável — fora da v1.

**Builder entrega:**
- Login: valida email+senha (bcrypt compare), emite JWT com `{ sub, perfil }`.
- `PerfilGuard` lê o token, compara com `@Perfis()` da rota; sem permissão → 403; sem token em rota protegida → 401.
- Senha comparada via hash; port `PasswordHasher` no application, `BcryptPasswordHasher` na infra.
- Constraint: sem secret hardcoded; `JWT_SECRET` via env.

**Evaluator valida:**
```bash
npm test -- --testPathPattern=auth
# unit: LoginUseCase (senha válida/ inválida), PerfilGuard (perfil ok / 403 / sem token 401)
```

**Critério de aceite:**
- [ ] Testes de auth passam (login ok/falho, guard ok/403/401).
- [ ] Zero secret literal (compliance-grep limpo).
- [ ] Cobertura da área não caiu.

---

### TASK-03 — Admin cria usuário (RF-02)

**Critério de sucesso (declare ANTES de codar):**
> `POST /usuarios` autenticado como ADMIN cria usuário e ele consegue logar (TASK-02); mesmo request como não-admin retorna 403; email duplicado retorna 409.

**Diff esperado:**
- Módulo `src/usuario/` — `domain/` (entidade User + invariante de email), `application/` (CriarUsuarioUseCase + `UsuarioRepository` port), `infrastructure/` (`PrismaUsuarioRepository`), `usuario.controller.ts` (guard `@Perfis(ADMIN)`), DTO de entrada com validação.
- Tamanho estimado: ~180 linhas.

**Fora do escopo desta TASK:**
- Editar/desativar/excluir usuário — fora da v1 (`prd.md` §6, sustenta premissa RF-07).

**Builder entrega:**
- Criação: valida DTO (email formato, senha mínima, perfil ∈ enum), faz hash da senha (port de TASK-02), persiste.
- Só ADMIN acessa (guard). Email duplicado → 409 (`ConflictException`).
- Constraint: senha nunca retornada na resposta; sem `any`.

**Evaluator valida:**
```bash
npm test -- --testPathPattern=usuario
# unit: CriarUsuarioUseCase (cria, hash aplicado, email duplicado → erro)
# e2e opcional: POST /usuarios como ADMIN 201; como CLIENTE 403
```

**Critério de aceite:**
- [ ] Testes passam (cria, 403 não-admin, 409 duplicado).
- [ ] Resposta nunca expõe `senhaHash`.
- [ ] Cobertura não caiu; lint sem novos warnings.

---

### TASK-04 — Cliente abre chamado (RF-03)

**Critério de sucesso (declare ANTES de codar):**
> `POST /chamados` autenticado como CLIENTE com texto válido cria chamado em `AGUARDANDO_CLASSIFICACAO` e retorna 201; texto vazio/só-espaços ou fora de 1–5.000 chars (após `trim`) retorna 400.

**Diff esperado:**
- Módulo `src/chamado/` — `domain/` (entidade Chamado + factory que nasce `AGUARDANDO_CLASSIFICACAO`), `application/` (`AbrirChamadoUseCase` + `ChamadoRepository` port), `infrastructure/` (`PrismaChamadoRepository`), `chamado.controller.ts`, DTO com validação de tamanho.
- Tamanho estimado: ~160 linhas.

**Fora do escopo desta TASK:**
- Enfileirar para classificação (RF-06) — Sprint-2. Nesta task o chamado só persiste.
- Atribuição a funcionário (RF-07) — Sprint-2 (`funcionarioId` fica null).

**Builder entrega:**
- Validação no DTO: `trim` → comprimento ∈ [1, 5000]; vazio/branco → 400.
- Entidade nasce `AGUARDANDO_CLASSIFICACAO`, ligada ao `clienteId` do token.
- Texto tratado como dado (não instrução) — sem interpolar em nenhum comando.
- Constraint: validação no trust boundary (DTO), não no service.

**Evaluator valida:**
```bash
npm test -- --testPathPattern=chamado
# unit: AbrirChamadoUseCase (status inicial correto), DTO (trim, limites 1/5000, vazio→400)
```

**Critério de aceite:**
- [ ] Testes passam (status inicial, validação de tamanho, vazio→400).
- [ ] Cobertura não caiu.
- [ ] Nada fora do "Diff esperado" tocado.

---

### TASK-05 — Máquina de estados do chamado (RF-09)

**Critério de sucesso (declare ANTES de codar):**
> Transição válida (`ABERTO → EM_ATENDIMENTO → RESOLVIDO`, `→ CANCELADO` de qualquer não-final) é aceita; transição inválida ou a partir de estado final (`RESOLVIDO`/`CANCELADO`) é rejeitada; só ADMIN cancela.

**Diff esperado:**
- `src/chamado/domain/` — função pura de transição (`podeTransitar(de, para): boolean` ou máquina de estados), regras de estado final.
- `src/chamado/application/` — `MudarStatusUseCase` (aplica autorização por perfil + regra de transição).
- `chamado.controller.ts` — `PATCH /chamados/:id/status`.
- Tamanho estimado: ~140 linhas.

**Fora do escopo desta TASK:**
- Gate "`→ EM_ATENDIMENTO` exige classificação válida" (RF-08) — depende de classificação, Sprint-2.
- Transição automática `AGUARDANDO → ABERTO` (disparada pela IA/classificação manual) — Sprint-2.
- Registro do evento `MUDANCA_STATUS` (RF-11) — Sprint-2.

**Builder entrega:**
- Regra de transição como **função pura no domain** (testável sem banco).
- `EM_ATENDIMENTO → RESOLVIDO` e cancelamento só de estados não-finais; estados finais rejeitam qualquer transição.
- Cancelamento restrito a ADMIN (guard); funcionário conduz `ABERTO → EM_ATENDIMENTO → RESOLVIDO` apenas em chamado atribuído a ele.
- Constraint: zero `if` de regra de negócio no controller (Humble Object) — regra vive no domain.

**Evaluator valida:**
```bash
npm test -- --testPathPattern=chamado
# unit: tabela de transições válidas/inválidas; final rejeita; cancelamento só ADMIN
```

**Critério de aceite:**
- [ ] Testes cobrem transições válidas, inválidas e estados finais.
- [ ] Regra de transição é função pura (roda sem subir Postgres).
- [ ] Cobertura não caiu.

---

### TASK-06 — Cliente acompanha seus chamados (RF-10)

**Critério de sucesso (declare ANTES de codar):**
> `GET /chamados` autenticado como CLIENTE retorna **apenas** os chamados do próprio cliente com status atual; nunca chamados de outro cliente (proteção IDOR).

**Diff esperado:**
- `src/chamado/application/` — `ListarMeusChamadosUseCase` (filtra por `clienteId` do token).
- `chamado.controller.ts` — `GET /chamados`.
- Tamanho estimado: ~60 linhas.

**Fora do escopo desta TASK:**
- Visão de funcionário/admin (listas diferentes) — Sprint-2.
- Histórico de eventos (RF-11) — Sprint-2.

**Builder entrega:**
- Filtro **sempre** pelo `clienteId` do token, nunca por parâmetro de query (anti-IDOR).
- Retorna id, texto, status, timestamps. Sem `resumo` (é read-only da IA, Sprint-2).
- Constraint: cliente não consegue forjar acesso a chamado alheio nem por id na URL.

**Evaluator valida:**
```bash
npm test -- --testPathPattern=chamado
# unit/e2e: cliente A não vê chamado de cliente B; lista só os próprios
```

**Critério de aceite:**
- [ ] Testes provam isolamento por cliente (IDOR bloqueado).
- [ ] Cobertura não caiu; lint limpo.

---

## Sensores obrigatórios ao fim do sprint

```bash
# 1) Build limpo
npm run build

# 2) Testes
npm test

# 3) Quality Gate
bash .harness/quality-gate.sh

# 4) Compliance grep (isolado)
bash .harness/collectors/compliance-grep.sh

# 5) Sem secrets
git diff origin/main -- '*.env*' '*.json' '*.yml' | grep -iE 'token|secret|password|api[_-]?key' || true
```

---

## Critério de aceite do sprint

- [ ] TASK-01..06 com status ✅ no `Progress.md`.
- [ ] `bash .harness/quality-gate.sh` exit 0.
- [ ] PR de cada feat mergeado em `main` (via dev, fluxo GitFlow do CI).
- [ ] `Progress.md` atualizado com fechamento de sprint.
- [ ] Baseline atualizado se cobertura melhorou (ver `plan-build/quality-gate.md`).
