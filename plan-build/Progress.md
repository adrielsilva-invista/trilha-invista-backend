<!--
CONVENÇÕES OBRIGATÓRIAS DESTE ARQUIVO (não apagar):

- "Visão Geral das Sprints", "Status Visual", "Bloqueios" e "Decisões" são TABELAS VIVAS:
  atualizadas ao longo das sessões. NÃO são append-only.
- "Log de Sessões" é APPEND-ONLY: nunca apague registros antigos.
- Quando uma Sprint conclui, adicione uma nova "Status Visual da Sprint-N" abaixo da
  anterior (mantém histórico visual de todas as sprints).
- IDs de decisão (D-01, D-02, ...) são SEQUENCIAIS e NUNCA reusados.
- Status visual usa: 🔴 (pendente) | 🟡 (em andamento) | ✅ (concluída) | ⛔ (bloqueada)
- Barra de progresso por TASK: [██████████] = 100%, [█████░░░░░] = 50%, [░░░░░░░░░░] = 0%.
- "Próximo passo exato" = UMA FRASE acionável, sem ambiguidade.
- "Próxima Sessão" no final é o que /harness lê PRIMEIRO ao retomar.
-->

# Progress.md — <NOME DO PROJETO>

> Memória entre sessões. Atualizar ao final de CADA sessão.
> Agente: leia isto PRIMEIRO antes de qualquer ação.

---

## 🗺️ Visão Geral das Sprints

| Sprint | Status | Início | Conclusão |
|--------|--------|--------|-----------|
| Sprint-1: <NOME> | 🟡 EM ANDAMENTO | <DATA> | — |

---

## Status Visual da Sprint Ativa

```
TASK-01 | [░░░░░░░░░░] | <DESCRIÇÃO> | 🔴 PENDENTE
TASK-02 | [░░░░░░░░░░] | <DESCRIÇÃO> | 🔴 PENDENTE
```

Progresso geral: 0/N TASKs (0%)

**Resultado dos testes:**
```
<MÓDULO>  | 0/0 | —
```
**Build:** —
**./.harness/quality-gate.sh:** —

---

## Bloqueios Ativos

| # | Bloqueio | Componente(s) | Impacto |
|---|----------|---------------|---------|
| — | Nenhum bloqueio ativo | — | — |

---

## Decisões Tomadas

| # | Decisão | Sprint | Contexto |
|---|---------|--------|---------|
| D-01 | <DECISÃO INICIAL> | Sprint-1 | <CONTEXTO> |

---

## Log de Sessões

> Append-only. Sessão mais antiga no topo, mais recente no fim.
> Template no final deste arquivo.

---

## Template para próximas sessões

Copiar e preencher ao encerrar a sessão:

```markdown
### Sessão YYYY-MM-DD — <RESUMO CURTO>

**Tasks trabalhadas:** TASK-XX, TASK-YY
**Status ao encerrar:** 🟡 Em progresso / ✅ Concluída

**O que foi feito:**
-

**Decisões:**
-

**O que ficou pendente:**
-

**Próximo passo exato:**
> (uma frase clara, sem ambiguidade)

**Sensores rodados:**
- [ ] build sem warnings
- [ ] testes passando
- [ ] ./.harness/quality-gate.sh — exit 0
- [ ] grep compliance — limpo
- [ ] grep secrets — limpo
```

---

## Próxima Sessão

**Começar em:** <PRÓXIMO PASSO EXATO>
**Contexto crítico:**
- <PONTOS QUE A SESSÃO SEGUINTE PRECISA SABER ANTES DE CODAR>
