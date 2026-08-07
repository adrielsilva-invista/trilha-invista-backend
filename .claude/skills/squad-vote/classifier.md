# Classifier — Técnica vs Negócio vs Cinza

Define como o **Tech Lead** classifica uma dúvida antes de decidir entre `/squad-vote` (autônomo) e abrir `Q_*.json` no Telegram (humano).

> **Nota:** exemplos abaixo (`/portfolio`, Serpro, Postgres→Dynamo)
> refletem o contexto Invista. Se você adotar este harness em outro projeto,
> substitua os exemplos pelos casos reais do seu domínio. As 3 categorias
> (técnica / negócio / cinza) e o algoritmo de classificação são genéricos.

## Regra simples

> **Como fazer** → técnica (vota)
> **O que / quando / se fazer** → negócio (pergunta)
> **Não tenho como saber** → cinza (default = pergunta)

## 1. Decisão TÉCNICA — `/squad-vote` decide sozinho

Características:
- A pergunta é **como implementar** algo já decidido em escopo.
- Existe pelo menos **um padrão** ou **um standard** que ajude a julgar.
- Erro pode ser corrigido em **um PR** sem afetar outros serviços.
- Não muda contrato externo nem prioridade do roadmap.

Exemplos reais do contexto Invista:

| Pergunta | Por que é técnica |
|---|---|
| HTTP resiliente: `Http.Resilience` ou `Http.Polly`? | `barramento-worker.md` fixa Resilience; decisão local |
| EF Core vs Dapper pra essa query? | Stack já fixada; só comparar nas circunstâncias |
| `INatsSubscriptionMessageHandler<T>` ou wrapper próprio? | Standard `barramento-worker.md` define handler |
| FluentAssertions vs assertion nativa do xUnit? | Padrão de testes; reversível |
| Logger estruturado: Serilog ou ILogger nativo? | Reversível, sem efeito em outro serviço |
| Estrutura interna do worker: pasta `Services/Base/` ou flat? | Standard diz "organização interna é livre" |

## 2. Decisão de NEGÓCIO — abre `Q_*.json` (PARA o loop)

Características:
- Pergunta sobre **o que** o produto deve fazer, **se** deve fazer, **quando**, **pra quem**, **por quê**.
- Muda escopo, prioridade, regra de domínio ou contrato externo.
- Resposta depende de stakeholder, não de leitura de código.

Exemplos:

| Pergunta | Por que é negócio |
|---|---|
| Endpoint `/portfolio` deve listar arquivados? | Regra de domínio |
| Adicionar feature X nesta sprint? | Escopo / prioridade |
| Webhook deve aceitar HTTP ou só HTTPS? | Política de segurança da empresa |
| Resposta da API externa veio com campo desconhecido — incluir ou ignorar? | Falta evidência → humano confirma |
| Vamos suportar bureau Y além do Serpro? | Roadmap |
| `transaction_id` deve persistir após sucesso? | Regra de auditoria |

## 3. Decisão CINZA — default = pergunta humano

Sempre que UM dos critérios abaixo bater, **mesmo que pareça técnica**, a decisão escala pra humano:

| Critério | Por quê |
|---|---|
| **Custo alto e irreversível** (ex.: trocar de cloud, de banco, de broker) | Não dá pra desfazer com 1 PR |
| **Toca outro serviço** fora do escopo da TASK atual | Regra do `harness-template/CLAUDE.md`: PARE e SINALIZE |
| **Adiciona dependência nova** (lib, serviço externo, broker) | Decisão de stack — humano |
| **Muda contrato público** (gRPC `.proto`, API REST, schema NATS) | Quebra clientes |
| **Toca segurança/LGPD** (auth, criptografia, secrets, dados pessoais) | Sempre humano |
| **Toca o `barramento-worker.md`** | É padrão inegociável da empresa |
| **Operação destrutiva** (drop table, rm -rf, force push) | Regra absoluta do CLAUDE.md |
| **Confiança média dos squads < 0.5** | Sinal de que falta evidência — humano decide |
| **Empate no quórum sem desempate disponível** | Escala |

## Algoritmo de classificação (passo a passo no Tech Lead)

```
0. (Passo 0 — feito no SKILL.md antes de chegar aqui) Scan de padrão destrutivo nas opções.
   Se encontrou DROP/TRUNCATE/rm -rf/force push/reset --hard/downgrade → CINZA imediato.

1. A pergunta é sobre O QUE / SE / QUANDO / PARA QUEM fazer (regra de domínio,
   escopo, prioridade, política de produto)?
   ├─ SIM → NEGÓCIO (pergunta humano via Q_*.json — não vota)
   └─ NÃO → próximo

2. A pergunta é sobre COMO implementar algo já decidido em escopo?
   ├─ NÃO  → CINZA (default seguro)
   └─ SIM  → próximo

3. A resposta tem fundamento em standard/spec/código existente?
   ├─ NÃO  → CINZA (falta evidência)
   └─ SIM  → próximo

4. Bate algum critério da tabela CINZA (custo alto, irreversível, contrato público,
   segurança/LGPD, toca barramento-worker.md, operação destrutiva)?
   ├─ SIM  → CINZA (escala humano)
   └─ NÃO  → próximo

5. É reversível em 1 PR sem tocar fora do escopo?
   ├─ NÃO  → CINZA
   └─ SIM  → TÉCNICA → /squad-vote
```

**Resumo das saídas:**
- `tecnica` — vota com 3 squads
- `negocio` — abre `Q_*.json`, NÃO vota
- `cinza` — escala humano, NÃO vota (default seguro)

## Onde isso é registrado

Toda decisão classificada gera um `decision.json` em `runs/decisions/` (relativo à pasta da skill) com o campo `classification`:

- `tecnica` — votada
- `negocio` — pergunta humano (não vota; só registra)
- `cinza` — pergunta humano (não vota; só registra)

Mesmo decisões de negócio/cinza geram artefato — porque mais tarde a gente revisa o classifier comparando "o que classificou como cinza" vs "o que poderia ter votado".
