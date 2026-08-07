# Voting Rules

Regras de quórum, seleção de squads, desempate e escalonamento.

> **Nota:** as especialidades de squad abaixo refletem a stack atual da Invista
> (.NET 8 / React / NATS / Barramento). Se você adotar este harness em outro
> contexto, ajuste a coluna "Especialidade" pra realidade do seu time. A
> mecânica de votação (quórum, desempate, gates de confiança) é stack-agnóstica.

## Squads disponíveis (skills reais)

| Squad | Especialidade |
|---|---|
| `squad-arquitetura` | Design de sistemas, ADRs, contratos, modelagem |
| `squad-backend` | .NET 8 / C# / EF Core / APIs / workers |
| `squad-frontend` | React / Next.js / TypeScript / UI |
| `squad-qa` | xUnit, Moq, FluentAssertions, code review |
| `squad-devops` | CI/CD, Docker, K8s, deploy, infra |
| `squad-finops` | Custo, performance, otimização |
| `squad-security` | OWASP, secrets, LGPD, auth |
| `squad-uiux` | Design system, acessibilidade, UX |
| `squad-pesquisa` | Análise de codebase, mapeamento, benchmarks |
| `squad-gp-po` | Backlog, sprint, user stories, MVP |

## Quórum

- **3 squads** votam em paralelo.
- **`squad-arquitetura` é o desempate** — se não estiver entre os 3, é convocado quando há empate.
- **Se `squad-arquitetura` já está entre os 3 e o resultado empata** → escala pra humano (não tem desempate).

## Seleção dos 3 squads — tabela tipo-de-decisão → squads

| Tipo de decisão | 3 squads | Desempate |
|---|---|---|
| **Cache / persistência** | backend, finops, arquitetura | já incluso → escala se empate |
| **Stack/framework dentro de stack já definida** | backend, arquitetura, pesquisa | já incluso → escala |
| **Estrutura interna de módulo/pasta** | backend, arquitetura, qa | já incluso → escala |
| **Estratégia de teste** | qa, backend, arquitetura | já incluso → escala |
| **CI/CD / build / Docker** | devops, backend, finops | arquitetura desempata |
| **Performance / otimização de query** | finops, backend, qa | arquitetura desempata |
| **Componente/lib UI** | frontend, uiux, qa | arquitetura desempata |
| **Estilização / design tokens** | uiux, frontend, qa | arquitetura desempata |
| **Refactor com impacto local** | backend, qa, arquitetura | já incluso → escala |
| **Logging / observabilidade** | backend, devops, arquitetura | já incluso → escala |
| **Tratamento de erro / retry** | backend, qa, arquitetura | já incluso → escala |
| **Mensageria NATS (subjects, headers)** | backend, arquitetura, devops | já incluso → escala |
| **Padrão Barramento (worker handler/contract)** | backend, arquitetura, qa | já incluso → escala |

> Decisão fora desses tipos → o Tech Lead **classifica como cinza** e escala pra humano (regra de ouro: na dúvida, pergunta).

## Confiança e escalonamento automático

Cada voto carrega `confidence: 0..1`. Regras:

| Condição | Ação |
|---|---|
| Média de confiança dos 3 votos < 0.5 | Escala pra humano (sinal de "falta evidência") |
| Pelo menos 2 votos com `confidence < 0.4` | Escala pra humano |
| Algum voto com `concerns` mencionando "irreversível" ou "fora do escopo" | Escala pra humano |
| Todos com `confidence >= 0.7` E maioria simples | Decisão consolidada |
| Empate **sem** arquitetura no quórum | Arquitetura é convocada (4º voto, desempate) |
| Empate **com** arquitetura no quórum | Escala pra humano |

## Modo da Fase 1 — `dry_run`

Na Fase 1 do amadurecimento (atual), **TODA decisão consolidada** entra com:

```json
{ "mode": "dry_run", "humano_consultado": true }
```

Ou seja:
1. Squads votam de verdade.
2. `decision.json` é gravado em `runs/decisions/` (relativo à pasta da skill).
3. Tech Lead **ainda assim** pergunta ao humano (apresenta o resultado da votação como sugestão).
4. `humano_choice` é registrada no decision.json.
5. `humano_match` = `true | false` se bateu com a votação.

Isso permite calibrar o classifier e as voting-rules antes de soltar o autônomo.

## Estados da decisão (pelo modo)

| Modo | Squads votam? | Aplica direto? | Pergunta humano? |
|---|---|---|---|
| `dry_run` (Fase 1-2) | ✅ | ❌ | ✅ |
| `assisted` (Fase 3) | ✅ | só com Enter humano | ✅ (1 confirmação rápida) |
| `autonomous` (Fase 4) | ✅ | ✅ | ❌ |

## Critério para avançar de fase

| Avançar para | Métrica | Janela |
|---|---|---|
| `dry_run` → `assisted` | `humano_match >= 0.7` | últimas 10 decisões |
| `assisted` → `autonomous` | 0 reversões humanas | últimas 20 decisões |
| Voltar fase (regressão) | qualquer reversão crítica | imediato |

## Operações destrutivas — sempre fora do voto

Independente da classificação, decisões abaixo **nunca votam** (regra absoluta do `harness-template/CLAUDE.md`):

- `rm -rf`
- `drop schema` / `drop table`
- `git push --force` em branch protegida
- `git reset --hard`
- Remoção/downgrade de dependência

→ Sempre confirmação humana.
