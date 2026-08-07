---
name: harness
description: Carrega o contexto do projeto antes de qualquer mudança de código (feed-forward). Ative quando o usuário chamar '/harness', 'carrega o harness', 'qual o estado do projeto', 'onde paramos', 'retoma o contexto', 'começa do zero hoje', 'me coloca no contexto'. Lê plan-build/STACK-SETUP.md → Progress.md → standards/ (padrões da empresa) → Sprint ativa → spec.md, e apresenta resumo de 3 linhas (+ aviso de setup se houver itens stack-specific pendentes).
---

# Skill: harness

## O que fazer ao ser acionado

1. **Check de setup stack-specific** — se `plan-build/STACK-SETUP.md` existir, contar itens `[ ]` não marcados. Se >0, anotar pra mostrar como aviso no resumo final (não bloqueia, só avisa). Se o arquivo não existir, assumir stack configurada (usuário deletou ao concluir setup).
2. **Ler `plan-build/Progress.md`** — é a memória entre sessões. A seção "Próxima Sessão" no fim do arquivo é o ponto de partida.
3. **Ler TODOS os arquivos em `plan-build/standards/`** — padrões inegociáveis da empresa (ex.: `barramento-worker.md`). Aplicam-se a qualquer projeto e a qualquer Sprint. Se um deles colidir com o que está sendo pedido, **PARE e SINALIZE** antes de codar.
4. **Ler a Sprint ativa** (`plan-build/Sprint-N.md` — a mais recente em "EM ANDAMENTO" no Progress.md).
5. **Consultar `plan-build/spec.md`** apenas se o usuário pedir contexto de produto/arquitetura, ou se a Sprint referenciar algo que precisa de definição.
6. **Apresentar resumo de 3 linhas (+ aviso de setup se houver):**
   - **Onde estamos:** Sprint N, TASK-XX em progresso (X/Y concluídas).
   - **O que fazer agora:** próximo passo exato (vindo da seção "Próxima Sessão").
   - **Bloqueios:** lista enxuta ou "nenhum".
   - (se houver itens unchecked no STACK-SETUP) **⚠ Setup stack pendente:** N itens em `plan-build/STACK-SETUP.md` — gate roda em modo stub até preencher.

Não comece a codar antes do humano confirmar o passo.

## Protocolo de encerramento de sessão

Ao final de cada sessão (quando o humano sinalizar parada, ou quando uma TASK fechar):

1. **Atualizar `plan-build/Progress.md`:**
   - Atualizar barra de progresso da TASK trabalhada.
   - Adicionar entrada no "Log de Sessões" (append-only) usando o template do final do arquivo.
   - Atualizar "Próxima Sessão" com **uma frase acionável**.
   - Se houve decisão arquitetural, registrar em "Decisões Tomadas" com ID sequencial novo.
2. **Rodar sensores:**
   ```bash
   ./.harness/quality-gate.sh
   ```
   E registrar o exit code na sessão.
3. **Confirmar** com o humano que o estado está salvo antes de encerrar.

## Estrutura do Harness

```
projeto/
├── CLAUDE.md                       # regras de isolamento + Quality Gate
├── .claude/skills/
│   ├── harness/SKILL.md            # esta skill (feed-forward)
│   ├── babysit/SKILL.md            # loop de PR (feed-back)
│   └── squad-vote/                 # decisão técnica via votação de squads
│       ├── SKILL.md                # protocolo de votação (Passo 0..5)
│       ├── classifier.md           # técnica vs negócio vs cinza
│       ├── voting-rules.md         # quórum 3 + arquitetura desempata
│       ├── calibration-log.md      # histórico de testes e ajustes
│       ├── templates/              # vote.json, decision.json (schema v2)
│       └── runs/                   # votos e decisões reais (votes/, decisions/)
├── plan-build/
│   ├── standards/                  # padrões inegociáveis da empresa (barramento, etc)
│   ├── STACK-SETUP.md              # checklist stack-specific (preencher por projeto)
│   ├── spec.md                     # produto e arquitetura DESTE projeto
│   ├── Sprint-N.md                 # sprint ativa (Builder ↔ Evaluator)
│   ├── Progress.md                 # memória entre sessões
│   ├── quality-gate.md             # métricas e padrões proibidos
│   └── baseline.json               # snapshot da catraca
├── .harness/
│   ├── quality-gate.sh             # roda gate
│   ├── compare-baseline.js         # compara métricas vs baseline
│   └── collectors/                 # 1 script por métrica
└── .github/workflows/
    └── quality-gate.yml            # CI
```

## Regras inegociáveis

| Regra | Justificativa |
|---|---|
| Padrões da empresa em `plan-build/standards/` valem para QUALQUER mudança | Inegociável (ex.: Barramento de Integração) |
| Mudança mínima — se cabe em 50 linhas, não escreva 500 | Reversibilidade |
| Isolamento — nunca toque em serviço fora do escopo da TASK | Deploy incremental |
| Secrets — nunca hardcode, sempre `.env` ou variável de ambiente | Segurança |
| Quality Gate sempre roda antes de declarar done | Anti-entropia |
| Compliance grep zero — sempre | Padrões críticos do projeto |
| Progress.md atualizado ao fim da sessão | Continuidade |
| Antes de alterar arquivo: listar criar/alterar/impacto e parar se vazar escopo | Previsibilidade |
| Sem log/dado real, sem diagnóstico | Não chutar |
| Decisão técnica ambígua → `squad-vote` antes de parar pra perguntar | Reduz interrupção sem perder rigor |
| Decisão de negócio ou destrutiva → SEMPRE pergunta humano | Risco irreversível |

## Gatilhos de ativação

`/harness`, "carrega o harness", "qual o estado do projeto", "onde paramos", "retoma o contexto", "começa do zero hoje", "me coloca no contexto".
