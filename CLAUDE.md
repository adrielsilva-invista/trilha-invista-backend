**IGNORE A PASTA ./v0 ./files-estacao-2 ./files-estacao-3**

# CLAUDE.md — Harness

> Este arquivo carrega TRÊS partes: regras de isolamento de escopo (Parte 1), o protocolo de Quality Gate / Loop de PR (Parte 2) e o protocolo de decisões técnicas via squad-vote (Parte 3). Todas são obrigatórias.

---

## PARTE 1 — Isolamento e escopo

Regras genéricas, válidas para qualquer mudança em qualquer serviço.

- Trabalhar com mudanças **mínimas e incrementais**. Se a tarefa pode ser feita em 50 linhas, não escreva 500.
- Nunca alterar serviços fora do escopo atual. Tocar fora do escopo só com pergunta explícita ao humano.
- Nunca executar mudanças destrutivas em massa (rm -rf, drop schema, force push, reset --hard) sem confirmação.
- Nunca reconstruir toda a stack quando o objetivo é apenas um serviço. Build incremental sempre.
- Sempre preservar compatibilidade com **deploy incremental**: o serviço em mudança precisa ir pra produção sozinho.
- Sempre priorizar **isolamento, previsibilidade e reversibilidade** acima de elegância arquitetural.
- Antes de modificar qualquer arquivo:
  1. Listar arquivos a **criar**.
  2. Listar arquivos a **alterar**.
  3. Informar **impacto fora do escopo** (se houver).
  4. **Parar** se houver impacto fora do escopo e pedir confirmação.
- Nunca usar nomes genéricos (`api`, `service`, `app`) para serviços ou containers — sempre nome específico do projeto.
- Sempre trabalhar dentro da pasta do serviço atual. Não vaze para irmãos.
- Se a mudança afetar outro serviço, **PARE e SINALIZE**. Não tome a decisão sozinho.
- **Confiar no estado que o humano afirma.** Se ele disse "a dev está atualizada", "já dei push", "o merge entrou" — é verdade. Não rodar comando pra verificar (`git log`, `git status`, `git fetch`) o que ele acabou de afirmar. Push/pull são manuais dele (chave SSH); o gate roda no CI. Verificar o que já foi afirmado = desperdício e desconfiança.

---

## PARTE 2 — Quality Gate e Loop de PR

### Por que existe

A IA escreve código rápido demais. Sem catraca, a entropia ganha: cobertura cai, duplicação cresce, lint vira ruído de fundo, arquivos viram monstros de 2.000 linhas. O Quality Gate inverte o jogo: **a IA escreve, a IA revisa, e o humano deixa de ser corretor — vira arquiteto do controle de qualidade.**

### Regra de ouro da catraca

> **Um PR pode adicionar código, mas não pode degradar nenhuma métrica do baseline. Nem por 0,1 ponto percentual.**

Se o baseline diz `coverage_pct: 73.4`, o PR só passa se a cobertura for ≥ 73.4. `73.3` reprova. Sem exceção.

### Cinco métricas canônicas

| Métrica | Direção da catraca | Coletor |
|---|---|---|
| Cobertura de testes | Não pode reduzir | `.harness/collectors/coverage.sh` |
| Duplicação de código | Não pode aumentar | `.harness/collectors/duplication.sh` |
| Violações de lint | Não pode aumentar | `.harness/collectors/lint.sh` |
| Maior arquivo (linhas) | Não pode aumentar | `.harness/collectors/file-size.sh` |
| Compliance grep | **Sempre zero** | `.harness/collectors/compliance-grep.sh` |

Compliance grep é gate **absoluto** — qualquer violação reprova imediatamente, não respeita catraca.

### Loop obrigatório de PR

```
Coda → Commit → Push → PR → Review (CI + LLM) → verde? ─┬─ sim → merge
                                                         └─ não → volta pro Coda
```

O agente que está de babysit no PR **só sai do loop com merge ou parada explícita**. Não há "vou olhar amanhã".

### Granularidade: 1 TASK = 1 branch = 1 PR

> **Cada TASK do Sprint vira uma branch `feat/<escopo>` própria e um único PR. Nunca agrupar TASKs numa branch só.**

- Antes de codar uma TASK: `git checkout -b feat/<escopo>` a partir de `dev` (ex.: `feat/crud-chamado`).
- Uma TASK fecha seu próprio loop de PR (feat → gate → auto-PR dev → merge manual → auto-PR main → merge manual) **antes** de começar a próxima.
- Fatiar bem a TASK é responsabilidade do planejamento (Sprint-N.md): PR pequeno, revisável, com catraca por unidade mínima. Um PR que carrega 2+ TASKs viola isolamento e reversibilidade (Parte 1).

### Restrição de escopo no babysit

Se a correção exigida pelo review tocar **outro serviço** ou exceder o escopo do PR, o agente **PARA e SINALIZA**. Não estende escopo silenciosamente. PR cresce em entropia, não em tamanho.

### Code review automático antes do humano

1. **CI estrutural** — `.github/workflows/quality-gate.yml` roda o gate e comenta no PR.
2. **Reviewer LLM** — Copilot Review, CodeRabbit ou equivalente.
3. **Humano** — só revisa quando os dois acima estão verdes.

### Saída do loop

Só sai com **TODAS as condições**:

- [ ] CI verde (todos os checks)
- [ ] Zero comentários abertos no PR
- [ ] Zero conversations não resolvidas
- [ ] Baseline não piorou em nenhuma métrica
- [ ] Compliance grep zerado

### Regra final

> **O agente NUNCA declara "done" sem rodar `./.harness/quality-gate.sh` e ter exit 0.**

---

## PARTE 3 — Decisões técnicas via squad-vote

### Por que existe

Sem catraca de decisão, o Tech Lead trava em cada bifurcação técnica e para o loop pra perguntar ao humano. Isso quebra qualquer execução autônoma (Sprint hands-off, build-loop overnight). A solução: **decisão técnica é votada por 3 squads**; decisão de negócio continua parando pra humano.

### Quem aciona

- **Auto** — o Tech Lead aciona `/squad-vote` quando classifica a dúvida como **técnica** (vide `.claude/skills/squad-vote/classifier.md`).
- **Manual** — o humano aciona `/squad-vote <pergunta>` em modo cirúrgico (raro).

**Nunca** o humano precisa digitar `/squad-vote` no fluxo padrão.

### O que é técnico, o que é negócio (resumo)

| Categoria | O que é | Quem decide |
|---|---|---|
| **Técnica** | Como implementar algo já decidido em escopo (cache, ORM, lib, estrutura de pasta) | `/squad-vote` |
| **Negócio** | O quê / quando / se / pra quem fazer | Humano via `Q_*.json` |
| **Cinza** | Custo alto, irreversível, fora de escopo, segurança/LGPD, contrato público, destrutivo | Humano (default seguro) |

Detalhes em `.claude/skills/squad-vote/classifier.md` e `voting-rules.md`.

### Quórum

- **3 squads** votam em paralelo.
- **`squad-arquitetura` desempata** se não estiver entre os 3.
- Empate **com** arquitetura no quórum → escala humano.

### Modo atual: Fase 1 — `dry_run`

Nesta fase de amadurecimento:
- Squads votam de verdade.
- Decisão é gravada em `.claude/skills/squad-vote/runs/decisions/`.
- Humano **ainda assim** confirma (vê resultado da votação como sugestão).
- `humano_match` calibra o classifier.

Avanço de fases:
1. `dry_run` → `assisted` quando `humano_match >= 0.7` em 10 decisões.
2. `assisted` → `autonomous` quando 0 reversões em 20 decisões.
3. `autonomous` libera `/build-loop` overnight.

### Operações destrutivas — fora do voto

`rm -rf`, `drop schema`, `git push --force`, `git reset --hard`, downgrade de dependência → **sempre** confirmação humana, nunca votado.

### Saída

A skill `squad-vote` produz:
- `.claude/skills/squad-vote/runs/votes/vote_*.json` — voto por squad
- `.claude/skills/squad-vote/runs/decisions/decision_*.json` — consolidação

Esses artefatos são o histórico auditável das decisões técnicas — fonte de verdade junto com os arquivos do `harness`.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes_tool` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context_tool` | Need source snippets for review — token-efficient |
| `get_impact_radius_tool` | Understanding blast radius of a change |
| `get_affected_flows_tool` | Finding which execution paths are impacted |
| `query_graph_tool` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool` | Finding functions/classes by name or keyword |
| `get_architecture_overview_tool` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.
