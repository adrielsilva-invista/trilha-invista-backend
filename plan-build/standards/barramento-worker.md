# Standard: Barramento Worker (.NET)

> Standard do papel **Worker NATS** do Barramento BSN Invista.
> Aplica-se quando o projeto é um worker .NET de integração que será absorvido pelo Barramento BSN Invista.
> Versão 1.1 — 2026-07-10 (migração .NET 10)

## Quando este standard se aplica

✅ Aplica:
- Worker .NET que consome do NATS, chama API externa (Serpro, Serasa, Cial, B3, etc.) e devolve resultado via webhook.
- Projetos derivados do `Placeholder.Worker` ou que serão absorvidos no repositório principal do barramento.

❌ Não aplica:
- Frontends, n8n workflows, RAG pipelines, dashboards, scripts auxiliares.
- Workers que não vão pro barramento BSN.
- Adaptadores REST síncronos — este standard cobre só o **Worker NATS** assíncrono.

## Referência canônica

- Repo: `https://github.com/invista-credito-investimento-sa/barramento-worker-template`
- Docs internas do template:
  - `README.md` — visão geral e quick start
  - `docs/arquitetura.md` — fluxo assíncrono e contratos
  - `docs/setup.md` — setup local
  - `docs/devtool.md` — DevTool.Api
  - `docs/criando-novo-worker.md` — como adaptar o Placeholder

Quando este standard divergir do repo, **o repo é a fonte de verdade**. Atualize este arquivo.

## Stack obrigatória

| Camada | Tecnologia | Observação |
|---|---|---|
| Runtime | .NET 10 SDK (LTS) | `global.json` pinado em `10.0.100`, `rollForward: latestFeature` |
| Container | Docker + docker-compose | Multi-stage; imagens `sdk`/`aspnet:10.0` (Ubuntu 24.04 "Noble") |
| Broker | NATS | Único broker permitido |
| Persistência | Postgres + EF Core 10 + Npgsql 10 | Source-of-truth durável |
| HTTP resiliente | `Microsoft.Extensions.Http.Resilience` | **Não** usar `Http.Polly` — legado no .NET 10 |
| Contratos | Protobuf / gRPC | `src/Protos/` |
| Tracing | OpenTelemetry → OTLP → Jaeger | http://localhost:16686 |
| Métricas | Prometheus | scrape em `/metrics` |
| Logs | stdout (estruturados, JSON) | Capturados via `docker logs` |
| Solution | formato `.slnx` (XML) | substitui o `.sln` clássico |

## Princípios inegociáveis

1. **Worker é assíncrono.** Consome do NATS, **não expõe gRPC próprio**. Quem expõe gRPC é o Orquestrador.
2. **Resultado via webhook.** O cliente passa `webhook_url` no request original; o worker publica `WebhookDispatchEvent` no subject `webhook.dispatch` ao final.
3. **Sem polling.** Não existe `GetStatus` / `GetResult` no worker. Quem quer resultado espera o callback.
4. **Worker não cria `Transaction`.** Ele assume que existe (criada pelo Orquestrador) e falha com erro se não achar.
5. **Idempotência via `transaction-id`.** Mesma transação processada duas vezes deve produzir o mesmo efeito (não duplicar persistência, não disparar webhook duas vezes).

## Headers NATS obrigatórios

Todo handler espera estes headers nas mensagens consumidas:

| Header | Obrigatório | Uso |
|---|---|---|
| `transaction-id` | **Sim** | Liga a mensagem à linha da `Transaction` |
| `webhook-url` | **Sim** | Enviado no `webhook.dispatch` ao final |
| `correlation-id` | Não | Tracing OTel cross-service |

Leitura via helper: `Shared.Utils.TracingHeaders`.

## Tabela `Transactions` — campos relevantes pro worker

| Coluna | Quem escreve | Estados |
|---|---|---|
| `TransactionId` | Orquestrador (PK GUID) | — |
| `CorrelationId` | Orquestrador (opcional) | — |
| `Status` | **Worker** | `Pendente` → `Processando` → `Concluido` \| `Erro` |
| `Mensagem` | **Worker** | Texto do resultado/erro |
| `WebhookUrl` | Orquestrador | Usado pelo Webhook Dispatcher |
| `CreatedAt` / `UpdatedAt` | auto | — |

## Contratos de integração com `Shared` (pontos de contato)

Estes são os **acoplamentos obrigatórios** que permitem ao time do barramento absorver o worker. Se algum não estiver respeitado, sinalize e corrija antes de entregar.

| Contrato | Origem |
|---|---|
| Entidade EF implementa `IIntegrationEntity` | `Shared/Models/IIntegrationEntity.cs` |
| Config EF herda de `IntegrationEntityConfiguration<T>` | `Shared/Data/Configurations/IntegrationEntityConfiguration.cs` |
| `DbSet<>` registrado no `AppDbContext` | `Shared/Data/AppDbContext.cs` |
| Handler implementa `INatsSubscriptionMessageHandler<TRequest>` | `Shared/Nats/INatsSubscriptionMessageHandler.cs` |
| Handler lê `transaction-id` via `TracingHeaders` | `Shared/Utils/TracingHeaders.cs` |
| Handler publica via `IWebhookEventPublisher` ao final | `Shared/Webhook/IWebhookEventPublisher.cs` |
| Subject NATS registrado em `NatsSubject.Xxx` | `Shared/Nats/Subjects/` |
| Registro do handler via `services.AddNatsSubscription<>(...)` | `Shared/Nats/NatsConsumerExtensions.cs` |

## Estrutura mínima de um worker

A organização **interna** é livre. O esqueleto do `Placeholder.Worker` é apenas exemplo:

```
<Nome>.Worker/
├── <Nome>.Worker.csproj
├── Program.cs
├── appsettings.json
├── <Nome>/                         # HTTP client, options, extensions
├── Services/
│   ├── Base/
│   │   └── Base<Nome>ServiceHandler.cs   # cache → API → persist → webhook
│   └── <Operation>Handler.cs
├── Metrics/
│   └── <Nome>Metrics.cs
└── Observability/
    └── ObservabilityExtensions.cs
```

## Serialização NATS

`NatsProtoBufSerializerRegistry` (do Shared) decide automaticamente:

- Tipos `Google.Protobuf.IMessage` → **Protobuf**
- Demais tipos → **JSON** (ex.: `WebhookDispatchEvent`)

Você define `.proto` em `src/Protos/`, a lib gera a classe C#, publica/consome pelo tipo.

## Fluxo de entrega (handoff pro time do barramento)

1. Clonar este template, adaptar `Placeholder.Worker` → `<MyApi>.Worker`.
2. Testar localmente com `DevTool.Api` (substitui Orquestrador + Webhook Dispatcher).
3. Entregar o código.
4. Time do barramento copia a pasta `<MyApi>.Worker/` pra dentro do repo principal, ajusta `AppDbContext` e `docker-compose`, roda migration em dev e faz deploy.

## Validações antes de declarar "done"

- [ ] Stack respeitada (.NET 10, NATS, Postgres+EF Core 10, gRPC nos contratos)
- [ ] Worker **não** expõe gRPC próprio
- [ ] Headers `transaction-id` e `webhook-url` lidos via `TracingHeaders`
- [ ] Persistência via entidade implementando `IIntegrationEntity`
- [ ] Publicação final via `IWebhookEventPublisher`
- [ ] Subject NATS registrado em `NatsSubject.*`
- [ ] Handler registrado via `AddNatsSubscription<>`
- [ ] Idempotência verificada com mesma `transaction-id`
- [ ] Tracing OTel propagado via headers NATS
- [ ] Logs estruturados com `correlation_id`
- [ ] Sem polling em banco (eventos via NATS; resultado via callback/webhook)

## Quando bypass deste standard é legítimo

Apenas se o serviço **não é** um worker do barramento (ver "Quando este standard se aplica"). Caso contrário, bypass **não autorizado** — PARE e SINALIZE.
