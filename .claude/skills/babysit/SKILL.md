---
name: babysit
description: Fica de plantão num PR e roda o loop Coda → Commit → Push → PR → Review → Merge até o PR ficar verde e ser mergeado. Ative quando o usuário chamar '/babysit', 'baba o pr', 'monitora o pr', 'fica de plantão', 'roda o loop até merge', 'corrige até ficar verde', 'cuida do pr até mergear', 'fica em cima do pr'. Aplica catraca do baseline, respeita escopo, para se vazar para outro serviço.
---

# Skill: babysit

## Loop principal (9 passos)

Execute em ciclo até o PR mergear ou bater critério de parada.

1. **Identificar o PR ativo**
   ```bash
   gh pr view --json number,headRefName,state,statusCheckRollup,reviews,comments
   ```
   Se não houver PR aberto na branch atual, criar com `gh pr create`.

2. **Verificar estado do CI**
   ```bash
   gh pr checks
   gh run list --branch <branch> --limit 5
   ```

3. **Verificar comentários e conversations**
   ```bash
   gh pr view --json comments,reviewThreads
   ```
   Listar: comentários abertos do reviewer LLM (Copilot/CodeRabbit), conversations não resolvidas, comentários do humano.

4. **Avaliar critério de saída** (ver abaixo). Se atendido → merge. Senão, continua.

5. **Avaliar escopo** — se a correção exigida toca outro serviço, **PARA E SINALIZA**. Não estende escopo.

6. **Aplicar correção mínima** — só o necessário pra resolver o item específico do review. Mudança mínima, sem refactor oportunista.

7. **Commit + push**
   ```bash
   git add <arquivos>
   git commit -m "fix: <descrição curta>"
   git push
   ```

8. **Resolver conversations** que foram efetivamente endereçadas:
   ```bash
   gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<ID>"}) { thread { id } } }'
   ```

9. **Aguardar CI rodar e voltar ao passo 2.**

Atualizar `plan-build/Progress.md` a cada ciclo (linha curta no Log de Sessões com o ciclo N e o que mudou).

## Critério de saída (merge)

Sai do loop e merge **somente** quando TODAS as condições abaixo:

- [ ] CI verde (todos os checks)
- [ ] Zero comentários abertos
- [ ] Zero conversations não resolvidas
- [ ] `./.harness/quality-gate.sh` exit 0 (baseline OK)
- [ ] Compliance grep zerado

Comando de merge (squash padrão, ajustar conforme convenção do projeto):
```bash
gh pr merge --squash --delete-branch
```

## Critério de parada (sem merge)

Para imediatamente e sinaliza ao humano se:

- **Vazamento de escopo:** a correção exige tocar outro serviço/módulo fora do PR.
- **Decisão de produto:** o review levanta uma questão de produto, não de implementação.
- **3 ciclos improdutivos:** três iterações seguidas sem reduzir o número de comentários abertos. É sinal de que a correção não é mecânica.
- **Bloqueio externo:** dependência de credencial, infra, decisão de outra pessoa, secret faltando.

Em qualquer caso de parada: registrar em `plan-build/Progress.md` (Bloqueios Ativos) e parar.

## Regras inegociáveis durante babysit

| Regra | O que significa na prática |
|---|---|
| Isolamento | Não tocar em serviço fora do PR. Vazou? Para. |
| Catraca | Nenhuma métrica do baseline pode piorar. Nem 0,1pp. |
| Compliance | Compliance grep ZERO sempre. Sem exceção. |
| Secrets | Nada hardcoded. Tudo via `.env` ou env var. |
| Mudança mínima | Resolver o item, não refatorar de quebra. |
| Sem `--no-verify` | Hooks rodam. Falhou? Investiga. |
| Sem `--force` em main | Nunca. |
| Confirmar conversations só se de fato resolvidas | Não fechar pra "limpar UI". |

## Comandos típicos

```bash
# Estado do PR
gh pr view --json number,state,statusCheckRollup,comments,reviewThreads

# Checks
gh pr checks
gh run list --limit 5
gh run view <run-id> --log-failed

# Comentários
gh pr view --comments
gh api repos/:owner/:repo/pulls/<PR>/comments

# Quality Gate local
./.harness/quality-gate.sh

# Resolver conversation
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<THREAD_ID>"}) { thread { id } } }'

# Merge
gh pr merge --squash --delete-branch
```

## Atualização de Progress.md

A cada ciclo do loop, anexar uma linha curta na sessão atual do Log de Sessões:

```
- Ciclo N: <o que mudou> | CI: <status> | comentários abertos: <n> → <m>
```

Ao mergear, fechar a sessão com o template completo e atualizar a "Próxima Sessão".

## Regra final

> **Sem gate verde, o agente NÃO chama `gh pr merge`. Ponto.**

## Gatilhos de ativação

`/babysit`, "baba o pr", "monitora o pr", "fica de plantão", "roda o loop até merge", "corrige até ficar verde", "cuida do pr até mergear", "fica em cima do pr".
