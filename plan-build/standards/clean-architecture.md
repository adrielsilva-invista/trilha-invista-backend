# Standard: Clean Architecture

> **Obrigatório por default em todo projeto gerado pelo harness.**
> Bypass apenas para projetos sem domínio de negócio (ver "Bypass legítimo" no fim).
> Versão 2.0 — 2026-08-10 (migrado de .NET → NestJS/TypeScript; ver D-03 no Progress.md)

## Escopo padrão

Este standard vem **ligado por default** no harness:

- O `spec.md` §3 já vem com "Padrão arquitetural: **Clean Architecture**".
- Os patterns `clean_arch_nest` no `quality-gate.md` §3 já vêm **descomentados**.
- Sair disso exige bypass documentado.

Os patterns do compliance-grep só **disparam** dentro de pastas `src/**/domain/**` e
`src/**/application/**` (via `only_in`). Em projetos sem essas pastas (frontend puro,
n8n, script), eles passam silenciosos — mas a regra de "default ligado" é a mesma,
e o bypass formal vai no `spec.md`.

> Em workers que adotam `barramento-worker.md`: este standard é **complementar**.
> O `barramento-worker.md` define como o worker conversa com o barramento.
> O `clean-architecture.md` define como o **interior** do worker está organizado.

## Por que existe

Sem fronteira explícita entre domínio e framework, o código apodrece:

- Regra de negócio espalhada em controller, service e entity vira um Frankenstein impossível de testar sem subir Postgres.
- Troca de ORM, broker ou framework vira reescrita.
- A IA escreve rápido demais e, sem catraca, cria acoplamento que não dá pra reverter depois.

O objetivo aqui não é "ser fiel ao livro". É garantir que **a IA não quebre a arquitetura
quando codar dentro do harness**, e que o humano consiga reverter qualquer mudança ruim
sem precisar reler 50 arquivos.

## Princípio único, inegociável

> **Dependências apontam para dentro. Nunca para fora.**

Quem está no centro (regra de negócio pura) não sabe que existe banco, HTTP, fila ou
framework. Quem está na borda (controller, repositório, gateway de fila) conhece o
centro, mas o centro **não conhece** ninguém na borda.

Tudo o que vem a seguir são consequências verificáveis dessa regra.

## As 4 camadas (mapeadas para NestJS)

```
┌──────────────────────────────────────────────────────────┐
│  Frameworks & Drivers                                    │  ← borda externa
│  Nest runtime, Prisma Client, BullMQ, @anthropic-ai/sdk, │
│  jsonwebtoken, bcryptjs, fetch/HttpService, FileSystem   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Interface Adapters                                │  │
│  │  Controllers, Guards, Adapters de infra            │  │
│  │  (PrismaXRepository, JwtTokenService), DTOs de I/O │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Use Cases (application/)                    │  │  │
│  │  │  Orquestração de fluxo + ports (interfaces)  │  │  │
│  │  │                                              │  │  │
│  │  │  ┌────────────────────────────────────────┐  │  │  │
│  │  │  │  Entities (domain/)                    │  │  │  │
│  │  │  │  Regras de negócio puras, invariantes  │  │  │  │
│  │  │  └────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Seta de dependência: ↙↙↙ sempre apontando para o centro.
```

### Quem pode importar quem (NestJS — verificável por compliance-grep)

| Camada           | PODE importar de                                                | NÃO PODE importar de                                                     |
|---|---|---|
| `domain/`        | só ela mesma + stdlib TS/JS puro                                | `@nestjs/*`, `@prisma/client`, `bullmq`, `@anthropic-ai/*`, `jsonwebtoken`, `bcryptjs`, `fetch`/`HttpService` |
| `application/`   | `domain/`, ports próprios, **`@nestjs/common`** (DI + exceptions HTTP) | `@prisma/client`, `bullmq`, `@anthropic-ai/*`, `@nestjs/core`, clients de I/O concretos |
| `infrastructure/`| `domain/`, `application/`, drivers concretos (Prisma, jwt, bcrypt) | controllers HTTP (a borda REST fica no controller/módulo)                |
| controller/módulo| `domain/`, `application/`, `infrastructure/`                    | —                                                                        |

> **Adaptação NestJS (D-03):** diferente do .NET puro, a `application/` **pode** usar
> `@nestjs/common` — decorators de DI (`@Injectable`, `@Inject`) e as HttpException
> semânticas (`UnauthorizedException`, `ConflictException`) são o vocabulário idiomático
> do Nest para orquestração e não acoplam a application a um ORM/broker/transporte
> concreto. O que a application **não** pode é conhecer `@prisma/client`, `bullmq`,
> `@anthropic-ai/*` ou `@nestjs/core` (Reflector/execution context são coisa de guard/borda).
> A `domain/` continua **puríssima**: zero `@nestjs`, zero infra.

> Esta tabela é a fonte de verdade do compliance-grep em `quality-gate.md` §3 (`clean_arch_nest`).

## Estrutura de pastas recomendada (NestJS)

Um **módulo Nest por domínio**, camadas por pasta dentro do módulo:

```
src/
├── <dominio>/                          ← 1 módulo Nest por domínio (ex.: auth, usuario, chamado)
│   ├── domain/                         ← Entities + regras puras + tipos de domínio
│   │   ├── <agregado>.ts               (entidade/união/invariante — SEM import de @nestjs/prisma)
│   │   └── <agregado>.spec.ts          (teste puro, sem subir banco)
│   ├── application/                    ← Use Cases
│   │   ├── <acao>.usecase.ts           (orquestra fluxo; injeta ports)
│   │   ├── <acao>.usecase.spec.ts
│   │   └── ports.ts                    (interfaces que a infra implementa + tokens de DI)
│   ├── infrastructure/                 ← Implementação dos ports + acesso a I/O
│   │   ├── prisma-<agregado>.repository.ts   (Prisma Client mora aqui)
│   │   └── <servico>.service.ts        (jwt, bcrypt, gateway HTTP, etc.)
│   ├── guards/                         ← (quando houver) guards/decorators da borda
│   ├── <dominio>.controller.ts         ← Borda HTTP: DTO + validação + delega ao use case
│   └── <dominio>.module.ts             ← Wiring: liga cada port (token) à implementação
│
└── prisma/                             ← PrismaService global (driver compartilhado)
```

Variação para **worker** (alinhada com `barramento-worker.md`): trocar o
`<dominio>.controller.ts` por um handler/processor de fila (`<operacao>.processor.ts`)
que deserializa, chama o use case e publica o resultado — mesma regra de humildade.

## SOLID — checklist binário pro reviewer

Cinco perguntas. Toda PR de feature passa por essas.

| # | Pergunta | Verificável por |
|---|---|---|
| **S** (Single Responsibility) | A classe tem **uma única razão para mudar**? Se descrever em uma frase, há **um único verbo**? | Leitura. Se a classe se chama `Manager`, `Helper`, `Util`, `Service` genérico → falha presumida (compliance-grep pega o sufixo). |
| **O** (Open/Closed) | Para adicionar um novo caso, eu **estendo** (nova classe / nova implementação de port) ou **modifico** código existente? | Se a PR de "adicionar tipo X" mudou um `switch` gigante em vez de adicionar uma classe → falha. |
| **L** (Liskov Substitution) | Toda implementação de um port pode substituir o contrato **sem quebrar** (sem lançar "não implementado", sem ignorar parâmetros)? | Grep por `throw new Error` em produção (já proibido globalmente). |
| **I** (Interface Segregation) | Os ports consumidos têm **só os métodos que o cliente usa**? (ex.: `UsuarioLoginQuery` só tem `buscarPorEmail`, não o repositório inteiro.) | Contar métodos por interface; se >7, suspeitar. |
| **D** (Dependency Inversion) | Módulo de alto nível depende de **abstração** (port em `application/`), não de implementação concreta? | Compliance-grep: classe em `application/` não pode importar `@prisma/client`/`bullmq`/`@anthropic-ai`. |

> Se qualquer uma falhar → bloqueia o merge. Não negocia.

## Boundaries (fronteiras explícitas)

Toda dependência externa **não-determinística** entra no domínio via **port declarado na
camada que a usa** (`application/ports.ts`), com **token de DI string** e implementação
na `infrastructure/`:

| Dependência externa | Port em `application/` | Implementação na `infrastructure/` |
|---|---|---|
| Banco de dados        | `XRepository` / `XQuery`         | `PrismaXRepository` (Prisma)         |
| Hash de senha         | `PasswordHasher`                 | `BcryptPasswordHasher`               |
| Token JWT             | `TokenSigner` / `TokenVerifier`  | `JwtTokenService`                    |
| Relógio               | `Clock`                          | `SystemClock`                        |
| Gerador de ID         | `IdGenerator`                    | `CryptoIdGenerator`                  |
| API externa HTTP      | `XGateway`                       | `XHttpGateway`                       |
| Classificação IA      | `ClassificadorGateway`           | `ClaudeClassificadorGateway` (S2)    |
| Fila                  | `FilaClassificacao`              | `BullmqFilaClassificacao` (S2)       |

**Regra:** nada de `new Date()`, `Date.now()`, `Math.random()`, `crypto.randomUUID()`,
`fetch()`/`new HttpService()` direto dentro de `domain/` ou `application/`. Sempre via
port injetado. (Compliance-grep cobre `new Date`/`Date.now`/`Math.random` — ver
"Anti-patterns".)

## Screaming Architecture

A pasta raiz de cada módulo e o conteúdo de `domain/`/`application/` devem **gritar o
domínio**, não o framework.

✅ Bom — você vê o que o sistema faz:
```
src/
├── auth/
├── usuario/
├── chamado/
└── classificacao/
```

❌ Ruim — você só vê o framework:
```
src/
├── controllers/
├── services/
├── repositories/
└── models/
```

> Exceção única: dentro do controller/módulo e da `infrastructure/` (camada externa),
> nomes técnicos (`*.controller.ts`, `*.repository.ts`, `guards/`) são aceitos porque
> ali a borda **é** o framework.

## Humble Object — o que não dá pra testar isolado

Código difícil de testar (framework, infraestrutura) deve ser **o mais burro possível**.
Toda lógica testável fica em outra classe (use case ou domínio).

| Lugar | O que pode ter | O que NÃO pode ter |
|---|---|---|
| `*.controller.ts`   | Receber DTO, validar formato, chamar use case, mapear resposta | `if`/`switch` de regra de negócio, loop com lógica |
| `*.guard.ts`        | Extrair token, delegar decisão ao domínio (`perfilAutorizado`) | Cálculo/regra de negócio embutida |
| Processor de fila   | Deserializar, chamar use case, publicar resultado              | Cálculo, validação de domínio, decisão |
| `Prisma*Repository` | Query + materialização + traduzir erro do driver (P2002 → 409) | Regra de negócio, validação, transformação de domínio |
| `*.module.ts`       | Wiring de DI (liga port → implementação)                       | Lógica condicional baseada em dados |

**Heurística:** se o método tem `if` baseado em **dado de negócio** (não em configuração
técnica), provavelmente está na camada errada.

## Anti-patterns proibidos (compliance-grep)

Estes padrões reprovam o PR imediatamente quando aparecem em código de produção
(testes, mocks e `.example` são excluídos pelo coletor — ver `quality-gate.md` §3).
Fonte de verdade dos regex é o bloco `clean_arch_nest` no `quality-gate.md` §3; abaixo,
a intenção de cada um:

```yaml
clean_arch_nest:
  # domain/ é puríssimo: nada de framework, ORM, broker, IA, cripto de infra.
  - pattern: "from\\s+['\"]@nestjs/"
    only_in: "src/**/domain/**"
    message: "domain/ não importa @nestjs/*. Domínio é puro (D-03). Mova DI/HTTP para application/ ou borda."

  - pattern: "from\\s+['\"](@prisma/client|bullmq|@anthropic-ai|jsonwebtoken|bcryptjs)"
    only_in: "src/**/domain/**, src/**/application/**"
    message: "domain/ e application/ não conhecem ORM/fila/IA/cripto. Use um port + implementação na infrastructure/."

  - pattern: "from\\s+['\"]@nestjs/core"
    only_in: "src/**/application/**"
    message: "application/ não importa @nestjs/core (Reflector/ExecutionContext são de guard/borda)."

  # Sem relógio/aleatório direto no domínio ou use case (quebra testes determinísticos).
  - pattern: "new\\s+Date\\(|Date\\.now\\(|Math\\.random\\(|crypto\\.randomUUID\\("
    only_in: "src/**/domain/**, src/**/application/**"
    message: "Ponto de I/O escondido. Injete um port (Clock/IdGenerator) e implemente na infrastructure/."
```

> Os patterns globais (`any`, `@ts-ignore`, `throw new Error`, `console.*`, catch vazio,
> classes `*Manager`/`*Helper`/`*Util`, secrets literais) já valem em **todo** o código
> e reforçam SOLID/Clean Code — ver o topo do bloco `forbidden_patterns`.

## Bypass legítimo

Este standard é **default-on em todo projeto** gerado pelo harness. Bypass não é opcional silencioso — exige justificativa por escrito no `spec.md` §3.

**Casos onde o bypass é legítimo:**

| Caso | Por quê |
|---|---|
| Frontend puro (React/Next sem regra de negócio própria) | Lógica vive no backend. Não há camada de domínio para isolar. |
| Workflow n8n / Zapier / Make | Orquestração visual — não há código de aplicação onde aplicar a regra. |
| Script utilitário descartável (< 200 linhas, uso único) | Custo do isolamento > vida útil do código. |
| Dashboard só-leitura (consulta + render) | Sem regra de negócio escrita aqui. |
| Worker de roteamento puro (lê fila → chama API externa → publica) | Sem regra própria; toda lógica vive na API externa. |

**Como registrar o bypass:** no `spec.md` §3, substitua a linha `Padrão arquitetural: Clean Architecture` por:

```
Padrão arquitetural: Bypass de Clean Architecture. Motivo: <uma linha — ex.: "frontend puro, sem lógica de negócio".>
```

**Bypass silencioso → PARE e SINALIZE.** Apagar a linha sem substituir, ou comentar os patterns do `quality-gate.md` sem documentar, é violação do standard.

## Validação antes de declarar "done"

- [ ] Arquivos em `domain/` não importam `@nestjs/*`, `@prisma/client`, `bullmq`, `@anthropic-ai/*`, `jsonwebtoken`, `bcryptjs`.
- [ ] Arquivos em `application/` não importam `@prisma/client`, `bullmq`, `@anthropic-ai/*`, `@nestjs/core` (podem usar `@nestjs/common` para DI/exceptions).
- [ ] Cada dependência externa (banco, hash, token, clock, HTTP, fila, IA) tem port em `application/ports.ts` e implementação em `infrastructure/`.
- [ ] Pastas em `src/` refletem domínio (Screaming Architecture), não framework.
- [ ] SOLID checklist (5 itens) revisado no PR.
- [ ] `compliance-grep` zera todos os patterns `clean_arch_nest` do `quality-gate.md`.
- [ ] Testes de `domain/` e `application/` rodam **sem subir banco, fila ou HTTP** (mocks nos ports).

## Referência

- Conceitos canônicos de SOLID, Regra da Dependência, camadas e Screaming
  Architecture vêm da literatura amplamente difundida de engenharia de software
  (palestras públicas do autor, blog cleancoder.com, cursos abertos).
- Este standard **não reproduz** material com direito autoral; destila os
  princípios em regras verificáveis aplicáveis ao stack **NestJS 11 / TypeScript**
  deste harness (migrado de .NET 10 na v2.0 — ver D-03 no Progress.md).
