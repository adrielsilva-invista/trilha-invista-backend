# Standard: Clean Architecture

> **Obrigatório por default em todo projeto gerado pelo harness.**
> Bypass apenas para projetos sem domínio de negócio (ver "Bypass legítimo" no fim).
> Versão 1.1 — 2026-05-22

## Escopo padrão

Este standard vem **ligado por default** no harness:

- O `spec.md` §3 já vem com "Padrão arquitetural: **Clean Architecture**".
- Os patterns `clean_arch_dotnet` no `quality-gate.md` §3 já vêm **descomentados**.
- Sair disso exige bypass documentado.

Os patterns do compliance-grep só **disparam** dentro de pastas `*.Domain/**` e
`*.Application/**`. Em projetos que não têm esses `.csproj` (frontend puro, n8n,
script), eles passam silenciosos — mas a regra de "default ligado" é a mesma,
e o bypass formal vai no `spec.md`.

> Em workers que adotam `barramento-worker.md`: este standard é **complementar**.
> O `barramento-worker.md` define como o worker conversa com o barramento.
> O `clean-architecture.md` define como o **interior** do worker está organizado.

## Por que existe

Sem fronteira explícita entre domínio e framework, o código apodrece:

- Regra de negócio espalhada em controller, service e entity virá um Frankenstein impossível de testar sem subir Postgres.
- Troca de ORM, broker ou framework vira reescrita.
- A IA escreve rápido demais e, sem catraca, cria acoplamento que não dá pra reverter depois.

O objetivo aqui não é "ser fiel ao livro". É garantir que **a IA não quebre a arquitetura
quando codar dentro do harness**, e que o humano consiga reverter qualquer mudança ruim
sem precisar reler 50 arquivos.

## Princípio único, inegociável

> **Dependências apontam para dentro. Nunca para fora.**

Quem está no centro (regra de negócio pura) não sabe que existe banco, HTTP, fila ou
framework. Quem está na borda (controller, repositório, handler de fila) conhece o
centro, mas o centro **não conhece** ninguém na borda.

Tudo o que vem a seguir são consequências verificáveis dessa regra.

## As 4 camadas

```
┌──────────────────────────────────────────────────────────┐
│  Frameworks & Drivers                                    │  ← borda externa
│  ASP.NET, EF Core, NATS client, HttpClient, FileSystem   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Interface Adapters                                │  │
│  │  Controllers, Handlers NATS, Repositórios EF,      │  │
│  │  DTOs de I/O, Mappers                              │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Use Cases (Application)                     │  │  │
│  │  │  Orquestração de fluxo, interfaces de portas │  │  │
│  │  │                                              │  │  │
│  │  │  ┌────────────────────────────────────────┐  │  │  │
│  │  │  │  Entities (Domain)                     │  │  │  │
│  │  │  │  Regras de negócio puras, invariantes  │  │  │  │
│  │  │  └────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

Seta de dependência: ↙↙↙ sempre apontando para o centro.
```

### Quem pode importar quem (.NET — verificável por compliance-grep)

| Camada           | PODE importar de                          | NÃO PODE importar de                                        |
|---|---|---|
| Domain           | só ela mesma + BCL (`System.*`)           | `Microsoft.EntityFrameworkCore`, `Microsoft.AspNetCore.*`, `NATS.*`, `HttpClient`, `Dapper`, `Newtonsoft.Json` |
| Application      | Domain                                    | `Microsoft.EntityFrameworkCore`, `Microsoft.AspNetCore.*`, `NATS.*`, `HttpClient` |
| Infrastructure   | Domain, Application                       | `Microsoft.AspNetCore.Mvc` (controllers ficam na Web)      |
| Web/Host         | Domain, Application, Infrastructure       | —                                                          |

> Esta tabela é a fonte de verdade do compliance-grep em `quality-gate.md` §3.

## Estrutura de pastas recomendada (.NET 10)

```
src/
├── <Projeto>.Domain/                  ← Entities + regras puras
│   ├── <Agregado>/                    ← organizado por DOMÍNIO, não por tipo
│   │   ├── <Agregado>.cs              (entidade)
│   │   ├── <Agregado>Id.cs            (value object)
│   │   └── Events/                    (eventos de domínio)
│   ├── Abstractions/                  (interfaces puras: IClock, IIdGenerator)
│   └── <Projeto>.Domain.csproj        ← SEM referência a EF, ASP.NET, NATS
│
├── <Projeto>.Application/             ← Use Cases
│   ├── <Agregado>/
│   │   ├── Commands/
│   │   │   └── Criar<X>Command.cs + Handler.cs
│   │   ├── Queries/
│   │   └── Ports/                     (interfaces que a infra implementa)
│   │       └── I<Agregado>Repository.cs
│   └── <Projeto>.Application.csproj   ← Referencia Domain. Nada além.
│
├── <Projeto>.Infrastructure/          ← Implementação dos Ports + acesso a I/O
│   ├── Persistence/
│   │   ├── AppDbContext.cs            (EF Core mora aqui)
│   │   └── Repositories/<Agregado>Repository.cs
│   ├── External/                      (HttpClient, NATS, etc.)
│   └── <Projeto>.Infrastructure.csproj ← Referencia Application + Domain
│
└── <Projeto>.Web/                     ← Borda HTTP (ou .Worker pra worker)
    ├── Controllers/<Agregado>Controller.cs
    ├── Dtos/                          (request/response do HTTP)
    ├── Program.cs                     (DI, configuração)
    └── <Projeto>.Web.csproj           ← Referencia Application + Infrastructure
```

Variação para **worker** (alinhada com `barramento-worker.md`):

```
src/
├── <Projeto>.Domain/                  ← idem acima
├── <Projeto>.Application/             ← idem acima
├── <Projeto>.Infrastructure/          ← idem acima (inclui cliente NATS, Postgres)
└── <Projeto>.Worker/                  ← em vez de .Web
    ├── Handlers/<Operação>Handler.cs  (implementa INatsSubscriptionMessageHandler)
    └── Program.cs
```

## SOLID — checklist binário pro reviewer

Cinco perguntas. Toda PR de feature passa por essas.

| # | Pergunta | Verificável por |
|---|---|---|
| **S** (Single Responsibility) | A classe tem **uma única razão para mudar**? Se descrever em uma frase, há **um único verbo**? | Leitura. Se a classe se chama `Manager`, `Helper`, `Util`, `Service` genérico → falha presumida. |
| **O** (Open/Closed) | Para adicionar um novo caso, eu **estendo** (nova classe / nova implementação) ou **modifico** código existente? | Se a PR de "adicionar tipo X" mudou um `switch` gigante em vez de adicionar uma classe → falha. |
| **L** (Liskov Substitution) | Toda subclasse / implementação pode substituir a base **sem quebrar contrato** (sem lançar `NotImplementedException`, sem ignorar parâmetros)? | Grep por `throw new NotImplementedException` em produção. |
| **I** (Interface Segregation) | As interfaces consumidas têm **só os métodos que o cliente usa**? Existe alguma interface com 10+ métodos onde cada cliente usa 2? | Contar métodos por interface; se >7, suspeitar. |
| **D** (Dependency Inversion) | Módulo de alto nível depende de **abstração** (interface no Domain/Application), não de implementação concreta? | Compliance-grep: classe em Application não pode declarar `DbContext`, `HttpClient`, `NatsConnection` como dependência. |

> Se qualquer uma falhar → bloqueia o merge. Não negocia.

## Boundaries (fronteiras explícitas)

Toda dependência externa **não-determinística** entra no domínio via **interface declarada na camada que a usa**:

| Dependência externa | Interface no Domain/Application | Implementação na Infrastructure |
|---|---|---|
| Banco de dados        | `I<Agregado>Repository`         | `<Agregado>Repository` (EF)    |
| Relógio               | `IClock`                        | `SystemClock`                   |
| Gerador de ID         | `IIdGenerator`                  | `GuidIdGenerator`               |
| API externa HTTP      | `I<Serviço>Gateway`             | `<Serviço>HttpGateway`          |
| Publicação NATS       | `IIntegrationEventPublisher`    | `NatsEventPublisher`            |
| Sistema de arquivos   | `IFileStorage`                  | `LocalFileStorage` / `S3FileStorage` |
| Random / UUID         | `IRandomProvider`               | `CryptoRandomProvider`          |
| Email/SMS             | `INotificationSender`           | `SmtpNotificationSender`        |

**Regra:** não há `DateTime.Now`, `Guid.NewGuid()`, `new HttpClient()` dentro de Domain
ou Application. Sempre via interface injetada. (Compliance-grep cobre isso — ver §
"Anti-patterns").

## Screaming Architecture

A pasta raiz de `Domain/` e `Application/` deve **gritar o domínio**, não o framework.

✅ Bom — você vê o que o sistema faz:
```
Domain/
├── Cobranças/
├── Boletos/
├── Conciliação/
└── ContasReceber/
```

❌ Ruim — você só vê o framework:
```
Domain/
├── Controllers/
├── Services/
├── Repositories/
└── Models/
```

> Excessão única: dentro de `Web/` ou `Worker/` (camada externa), pastas técnicas
> (`Controllers/`, `Handlers/`) são aceitas porque ali a borda **é** o framework.

## Humble Object — o que não dá pra testar isolado

Código difícil de testar (UI, framework, infraestrutura) deve ser **o mais burro
possível**. Toda lógica testável fica em outra classe.

| Lugar | O que pode ter | O que NÃO pode ter |
|---|---|---|
| `Controller`         | Receber DTO, chamar use case, mapear resposta | `if`/`switch` de regra de negócio, loop com lógica |
| `Handler` NATS       | Deserializar, chamar use case, publicar webhook | Cálculo, validação de domínio, decisão |
| `Repository` EF      | Query + materialização                          | Regra de negócio, validação, transformação |
| `Program.cs`         | DI, registro de serviços                        | Lógica condicional baseada em dados |

**Heurística:** se o método tem `if` baseado em **dado de negócio** (não em
configuração técnica), provavelmente está na camada errada.

## Anti-patterns proibidos (compliance-grep)

Estes padrões reprovam o PR imediatamente quando aparecem em código de produção
(testes, mocks e `.example` são excluídos pelo coletor — ver `quality-gate.md` §3).

```yaml
clean_arch_dotnet:
  # Domain não pode conhecer ORM nem framework web nem broker
  - pattern: "^\\s*using\\s+Microsoft\\.EntityFrameworkCore"
    only_in: "**/*.Domain/**"
    message: "Domain não pode importar EF Core. Mover acesso a banco para Infrastructure."

  - pattern: "^\\s*using\\s+Microsoft\\.AspNetCore"
    only_in: "**/*.Domain/**, **/*.Application/**"
    message: "Domain/Application não conhecem ASP.NET. Borda HTTP fica em Web."

  - pattern: "^\\s*using\\s+NATS\\."
    only_in: "**/*.Domain/**, **/*.Application/**"
    message: "Domain/Application não conhecem NATS. Use interface IIntegrationEventPublisher."

  # Sem clock direto no domínio (quebra testes)
  - pattern: "DateTime\\.(Now|Today|UtcNow)"
    only_in: "**/*.Domain/**, **/*.Application/**"
    message: "Use IClock injetado. DateTime.Now/UtcNow é ponto de I/O escondido."

  # Sem Guid.NewGuid direto no domínio (quebra testes determinísticos)
  - pattern: "Guid\\.NewGuid\\("
    only_in: "**/*.Domain/**, **/*.Application/**"
    message: "Use IIdGenerator injetado."

  # Sem new HttpClient no domínio
  - pattern: "new\\s+HttpClient\\("
    only_in: "**/*.Domain/**, **/*.Application/**"
    message: "HttpClient vive na Infrastructure, atrás de IGateway."

  # NotImplementedException em produção = LSP quebrado
  - pattern: "throw\\s+new\\s+NotImplementedException"
    message: "LSP quebrado ou stub esquecido. Implementar ou remover da hierarquia."

  # Catch vazio = falha silenciosa
  - pattern: "catch\\s*\\([^)]*\\)\\s*\\{\\s*\\}"
    message: "Catch vazio. Tratar explicitamente ou propagar."
```

## Bypass legítimo

Este standard é **default-on em todo projeto** gerado pelo harness. Bypass não é opcional silencioso — exige justificativa por escrito no `spec.md` §3.

**Casos onde o bypass é legítimo:**

| Caso | Por quê |
|---|---|
| Frontend puro (React/Next/Blazor sem regra de negócio própria) | Lógica vive no backend. Não há camada de domínio para isolar. |
| Workflow n8n / Zapier / Make | Orquestração visual — não há código de aplicação onde aplicar a regra. |
| Script utilitário descartável (< 200 linhas, uso único) | Custo do isolamento > vida útil do código. |
| Dashboard só-leitura (consulta + render) | Sem regra de negócio escrita aqui. |
| Worker de roteamento puro (lê NATS → chama API externa → publica) | Sem regra própria; toda lógica vive na API externa. |

**Como registrar o bypass:** no `spec.md` §3, substitua a linha `Padrão arquitetural: Clean Architecture` por:

```
Padrão arquitetural: Bypass de Clean Architecture. Motivo: <uma linha — ex.: "frontend puro, sem lógica de negócio".>
```

**Bypass silencioso → PARE e SINALIZE.** Apagar a linha sem substituir, ou comentar os patterns do `quality-gate.md` sem documentar, é violação do standard.

## Validação antes de declarar "done"

- [ ] `Domain.csproj` não tem `<PackageReference>` para EF Core, ASP.NET, NATS, HttpClient, Dapper, Newtonsoft.
- [ ] `Application.csproj` referencia **apenas** `Domain.csproj`.
- [ ] Cada dependência externa (banco, clock, HTTP, fila) tem interface em Domain/Application e implementação em Infrastructure.
- [ ] Pastas em `Domain/` e `Application/` refletem domínio (Screaming Architecture), não framework.
- [ ] SOLID checklist (5 itens) revisado no PR.
- [ ] `compliance-grep` zera todos os patterns `clean_arch_dotnet` do `quality-gate.md`.
- [ ] Testes de Domain rodam **sem subir banco, fila ou HTTP**.

## Referência

- Conceitos canônicos de SOLID, Regra da Dependência, camadas e Screaming
  Architecture vêm da literatura amplamente difundida de engenharia de software
  (palestras públicas do autor, blog cleancoder.com, cursos abertos).
- Este standard **não reproduz** material com direito autoral; destila os
  princípios em regras verificáveis aplicáveis ao stack .NET 10 deste harness.
