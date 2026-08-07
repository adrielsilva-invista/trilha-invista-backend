# spec.md — <PREENCHER NOME DO PROJETO>

> Documento vivo de produto e arquitetura. Atualizar quando uma decisão de produto ou arquitetural mudar.
> Esta é a fonte da verdade que `/harness` consulta para entender o "porquê" do projeto.
>
> ⚠️ **Antes de tudo:** este projeto se encaixa nos padrões de `plan-build/standards/`.
> Em particular, **`standards/barramento-worker.md`** define o padrão do Worker NATS do Barramento BSN (NATS pub/sub, Postgres+EF Core, gRPC/Protobuf nos contratos). Identifique o papel deste projeto antes de preencher a seção 2.

---

## 0. Papel deste projeto no Barramento

> Resposta obrigatória antes de codar. Ver `plan-build/standards/barramento-worker.md`.

- **Papel:** <Cliente Solicitante / API REST adapter / Worker NATS / Outro>
- **Bordas externas (gRPC):** <listar contratos `.proto` ou "nenhuma">
- **Bordas externas (REST):** <listar OpenAPI ou "nenhuma">
- **Tópicos NATS pub/sub:** <listar ou "nenhum">
- **Persistência:** <Postgres? Redis? Quais coleções/tabelas?>

---

## 1. Visão do produto

- **O que é:** <PREENCHER>
- **Por que existe:** <PREENCHER — problema sendo resolvido>
- **Quem usa:** <PREENCHER — perfil do usuário final>
- **Valor central (uma frase):** <PREENCHER>

---

## 2. Microsserviços / Componentes

> Listar cada componente em primeiro nível. Para cada um, repetir o bloco abaixo.

### `<NOME-DO-SERVICO>`

- **Responsabilidade:** <uma frase>
- **Fluxo:** <entrada → processamento → saída>
- **Componentes internos:** <controllers, services, repos, workers, etc — preencher conforme stack>
- **Bloqueios ativos:** <ou "nenhum">

---

## 3. Arquitetura

- **Padrão arquitetural:** **Clean Architecture** — obrigatório por default. Ver `plan-build/standards/clean-architecture.md`.
  - Se este projeto **não tem domínio de negócio** (frontend puro, workflow n8n, script utilitário, dashboard só-leitura), apague esta linha e escreva no lugar:
    `Bypass de Clean Architecture. Motivo: <uma linha — ex.: "frontend puro, sem lógica de negócio".>`
- **Padrões de código:** **Clean Code** — obrigatório por default. Ver `plan-build/standards/clean-code.md`.
  - Se este projeto **não tem código humano-escrito** (workflow visual puro, arquivo de config gerado por tool), apague esta linha e escreva no lugar:
    `Bypass de Clean Code. Motivo: <uma linha — ex.: "workflow n8n, sem código humano-escrito".>`
- **Padrões de comunicação:** <síncrono REST, async via fila, gRPC, etc>
- **Modelo de dados:**
  - **Banco:** <PostgreSQL, MySQL, Mongo, etc>
  - **ORM/Driver:** <PREENCHER>
  - **Migrations:** <PREENCHER ferramenta>
- **Autenticação/Autorização:** <PREENCHER>
- **Observabilidade:** <logs estruturados, traces, métricas — preencher>

---

## 4. Regras transversais

- **Stack declarada:** <linguagem + versão, framework + versão, runtime + versão>
- **Padrões proibidos (compliance-grep):** ver `plan-build/quality-gate.md` seção "Padrões proibidos".
- **Secrets:** sempre via `.env` (não commitado) ou env var no CI. Nunca hardcoded.
- **Logs:** sempre estruturados (JSON), nunca `print`/`console.log` cru em produção.
- **Tratamento de erro:** explícito, sem `catch` vazio.
- **Idempotência:** endpoints/jobs idempotentes via `request_id` ou `correlation_id`.
- **CNPJ (se aplicável):** projeto que valida/recebe/persiste CNPJ segue `standards/cnpj-alfanumerico.md` (formato alfanumérico, IN RFB 2.229/2024 — jul/2026) e ativa o bloco `cnpj_alfanumerico` no `quality-gate.md` §3. CNPJ trafega como string; nunca como inteiro.

---

## 5. Definition of Done

Uma TASK só está pronta quando TODOS os itens abaixo são verdadeiros:

- [ ] Build limpo, sem warnings.
- [ ] Testes da área tocada passando.
- [ ] `./.harness/quality-gate.sh` retorna exit 0.
- [ ] Reviewers automáticos (CI + LLM) sem comentários abertos.
- [ ] Todas as conversations do PR resolvidas.
- [ ] `plan-build/Progress.md` atualizado com a sessão.
- [ ] Sem secrets, sem placeholders esquecidos, sem `TODO` deixado pra trás.

---

## 6. Variáveis de ambiente

> Listar todas as env vars que o projeto consome. Sem valores reais — apenas o nome e o que representa.

| Variável | O que é | Obrigatória? | Onde usada |
|---|---|---|---|
| `<NOME>` | <descrição> | sim/não | <serviço/componente> |

Arquivo de exemplo: `.env.example` na raiz do repositório.
