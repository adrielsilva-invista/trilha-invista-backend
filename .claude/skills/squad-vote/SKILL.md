---
name: squad-vote
description: Vota uma decisão técnica entre 3 squads relevantes. Use quando o Tech Lead identifica decisão técnica ambígua dentro do loop e quer evitar parar pra perguntar ao humano. Também ative em '/squad-vote <pergunta>', '/votar <pergunta>', 'vota essa decisão', 'pergunta pros squads', 'qual squad concorda'. Lê classifier.md, voting-rules.md, templates/, aciona squads em paralelo, consolida em decisions/. Na Fase 1 opera em modo dry_run (registra mas humano confirma).
---

# Skill: squad-vote

Skill auxiliar do **Tech Lead** para resolver **decisões técnicas** sem parar o loop pra perguntar ao humano.

## Quando ativar

| Gatilho | Origem |
|---|---|
| `/squad-vote <pergunta>` | Humano (cirúrgico, raro) |
| Tech Lead identifica decisão técnica ambígua | Auto (caso principal) |
| "vota essa decisão", "pergunta pros squads" | Humano em linguagem natural |

**Não ativar** para:
- Decisão de **negócio** (escopo, prioridade, regra de domínio) → abre `Q_*.json` em `runs/questions/`
- Decisão **cinza** (vide `classifier.md`) → escala humano
- Operações **destrutivas** (drop, rm -rf, force push, downgrade de dep)
- Pergunta sobre o **conteúdo** do `barramento-worker.md` (é imutável sem humano)

## Inputs obrigatórios

A skill recebe (do Tech Lead ou da invocação direta):

1. `question` — texto exato da pergunta
2. `context` — arquivo/linha/sprint/task em que surgiu
3. `options` — opções A, B, [C…] já levantadas pelo Tech Lead

Se faltar qualquer um → escala pra humano (não vota com input incompleto).

## Passos da skill

### 0. Scan de padrão destrutivo (gate absoluto)
Antes da classificação, percorrer o texto da `question` e de cada item em `options` procurando os padrões abaixo (case-insensitive):

| Padrão | Tipo |
|---|---|
| `DROP TABLE`, `DROP SCHEMA`, `DROP DATABASE` | SQL destrutivo |
| `TRUNCATE` | SQL destrutivo |
| `DELETE FROM` sem `WHERE` (ou `WHERE 1=1`) | SQL destrutivo |
| `rm -rf`, `rm -fr` | filesystem destrutivo |
| `git push --force`, `git push -f`, `--force-with-lease` em main/master | git destrutivo |
| `git reset --hard` | git destrutivo |
| `npm uninstall`, downgrade explícito de dependência | dependência destrutiva |

Se encontrar:
- Setar `destructive_detected: true` e `destructive_pattern: "<padrão exato>"` no `decision.json`.
- Forçar `classification: "cinza"`.
- **Encerrar imediatamente** com `winner: null`, `humano_consultado: true`. **NÃO** prosseguir pra Passo 1.

Se não encontrar: setar `destructive_detected: false` e `destructive_pattern: null`. Seguir pro Passo 1.

### 1. Classificar
- Ler `classifier.md` → aplicar algoritmo de classificação (já passa do Passo 0).
- Saída: `tecnica` | `negocio` | `cinza`.
- Se não for `tecnica` → grava `decision.json` com `winner: null` e `humano_consultado: true` e **encerra** sem votar.

### 2. Selecionar squads
- Ler `voting-rules.md` → tabela tipo-de-decisão → 3 squads.
- Determinar se `squad-arquitetura` está entre os 3 (define se há desempate disponível).
- Se nenhum tipo bate → escala (cinza).

### 3. Coletar votos em paralelo
- Acionar as 3 skills `squad-*` correspondentes **em paralelo** (uma única mensagem com 3 invocações simultâneas).
- Cada squad recebe:
  - A pergunta original
  - As opções
  - O contexto
  - Instrução: "responda APENAS no formato `templates/vote.json`, com `confidence: 0..1` e `evidence` apontando arquivo:linha ou standard"
- Coletar 3 `vote.json` (um por squad).

### 4. Validar votos (gates de confiança)
Antes de consolidar, aplicar regras de `voting-rules.md`:
- Média de confiança < 0.5 → escala humano
- 2+ votos com confiança < 0.4 → escala humano
- Algum `concerns` mencionando "irreversível" ou "fora do escopo" → escala humano

### 5. Consolidar
- Tally simples (contar votos por opção).
- Se há vencedor por maioria → `winner = X`.
- Se empate **e** `squad-arquitetura` NÃO está nos 3 → invocar `squad-arquitetura` como 4º voto (desempate).
- Se empate **e** `squad-arquitetura` JÁ está → escala humano.

**Síntese (campo `synthesis`):**
Após o tally, comparar os `rationale` dos votos. Se houver **convergência implícita** entre opções divergentes — por exemplo, voto A diz "Serilog" e voto B diz "ILogger", mas no fundo concordam em "ILogger no código + Serilog como provider" — registrar essa **síntese** no campo `synthesis` do `decision.json`.

Quando preencher `synthesis`:
- Convergência clara nos `rationale` (mesma intenção, escolhas diferentes pela linguagem do voto).
- Combinação operacional possível das opções vencedora e perdedora.
- A síntese **não invalida** o `winner` — só explicita que a melhor implementação combina ideias dos votos.

Quando deixar `synthesis: null`:
- Unanimidade na votação.
- Opções genuinamente exclusivas (ex: A) Postgres B) DynamoDB — sem síntese possível).
- Quando o voto vencedor já capta tudo.

### 6. Gravar artefatos
Criar (em runtime):
- `runs/votes/vote_<question_id>_<squad>.json` (3 ou 4 arquivos)
- `runs/decisions/decision_<question_id>.json` (1 arquivo, consolidado)

Usar templates de `templates/vote.json` e `templates/decision.json` desta skill.

### 7. Modo `dry_run` (Fase 1 — atual)
**SEMPRE** com `mode: "dry_run"`:
- Apresentar resultado ao humano em formato compacto:
  ```
  /squad-vote → <pergunta>
  Voto: A=2, B=1 → vencedor A (squad-X, squad-Y)
  Confiança média: 0.78
  Pra usar a votação: Enter
  Pra escolher outra opção: digite (ex: B)
  ```
- Aguardar input humano.
- Gravar `humano_choice` e `humano_match` no decision.json.
- Tech Lead segue com a escolha **do humano** (não da votação) na Fase 1.

### 8. Modos futuros (NÃO implementar agora)
- `assisted` (Fase 3): aguarda só Enter rápido, sem digitar opção alternativa.
- `autonomous` (Fase 4): aplica direto, registra em decision.json sem perguntar.

## Modo de execução por fase

Este é o **mecanismo** com que os votos do Passo 3 são coletados. Evolui conforme o squad-vote amadurece.

| Fase | Modo de coleta | Como funciona | Quando usar |
|---|---|---|---|
| **1 (atual — calibração)** | **inline** | A própria skill produz os 3 votos, narrando perspectiva de cada squad com base em `voting-rules.md` + standards (`barramento-worker.md`). Sem subagents. | Testes manuais, calibração de `classifier.md` e `voting-rules.md`. Trade-off: rápido, mas isolamento parcial. |
| **2+ (integração com Tech Lead)** | **Agent tool em paralelo** | Disparar 3 sub-agentes (`subagent_type: general-purpose`) em uma única mensagem com 3 tool calls simultâneas. Cada sub-agente recebe persona injetada via prompt + lê standards independentemente. Retorna `vote.json`. | Quando o Tech Lead aciona o squad-vote sem humano olhando. Trade-off: latência maior, mais tokens, isolamento real. |

**Critério para migrar Fase 1 → Fase 2:** ver `voting-rules.md` seção "Critério para avançar de fase" + `calibration-log.md`.

**Quando migrar:** o Passo 3 acima é reescrito pra Agent tool. A interface (templates JSON, voting-rules, classifier) não muda — só o mecanismo de coleta.

## Outputs

- 3 ou 4 `vote_*.json` em `runs/votes/`
- 1 `decision_*.json` em `runs/decisions/`
- Resposta inline pro Tech Lead (qual opção foi escolhida no final)

## Critérios de aceitação (validação antes de declarar done na Fase 1)

- [ ] `classifier.md` foi consultado e a classificação foi registrada
- [ ] Squads selecionados batem com a tabela de `voting-rules.md`
- [ ] Os votos foram coletados em paralelo (1 mensagem com N invocações)
- [ ] Cada `vote.json` tem `confidence`, `rationale`, `evidence` preenchidos
- [ ] `decision.json` tem `mode: dry_run` e `humano_consultado: true` na Fase 1
- [ ] Empate sem desempate disponível escalou pra humano
- [ ] Gates de confiança foram aplicados antes de consolidar

## O que NÃO fazer

- Não inventar squads que não existem (lista oficial em `voting-rules.md`)
- Não votar sobre decisão de negócio
- Não votar sobre operações destrutivas
- Não pular o classifier para "ganhar tempo"
- Não aplicar a decisão na Fase 1 sem perguntar ao humano
- Não invocar squads sequencialmente — sempre em paralelo

## Arquivos referenciados

| Arquivo | Função |
|---|---|
| `classifier.md` | Decide tecnica/negocio/cinza |
| `voting-rules.md` | Quórum, seleção de squads, gates de confiança |
| `templates/vote.json` | Schema do voto individual |
| `templates/decision.json` | Schema da decisão consolidada |

## Integração com outras skills

| Skill | Relação |
|---|---|
| `tech-lead` | Aciona esta skill quando classifica decisão como técnica |
| `harness` | NÃO lê `decisions/` no boot — squad-vote é invocado on-demand quando surge decisão técnica durante a sessão |
| `babysit` | NÃO aciona — babysit corrige o que veio do PR, não decide |
| `squad-*` (10 squads) | Invocados em paralelo no passo 3 |
