# Sprint-1 — <PREENCHER NOME DA SPRINT>

> Sprint estruturada no padrão **Builder ↔ Evaluator** (Anthropic): cada TASK tem uma entrega objetiva (Builder) e um critério de validação executável (Evaluator).

---

## Objetivo do Sprint

<PREENCHER em uma frase clara. O que esta sprint entrega de novo ao produto?>

---

## O que NÃO entra neste sprint

> Lista explícita do que está fora de escopo. Evita scope creep.

- <ITEM 1>
- <ITEM 2>

---

## Status de bloqueios

| # | Bloqueio | Componente | Impacto | Status |
|---|---|---|---|---|
| — | Nenhum | — | — | — |

---

## Contrato Builder ↔ Evaluator

### TASK-01 — <título curto>

**Critério de sucesso (declare ANTES de codar):**
> <UMA frase verificável objetivamente. Sem ambiguidade. Sem isso, não começa.>
> Exemplo: *"Endpoint GET /users/:id retorna 200 + JSON do usuário em < 200ms; 404 se não existir."*

**Diff esperado:**
- <arquivo(s) que devem mudar — quanto mais específico, melhor>
- Tamanho estimado: <~N linhas>

**Fora do escopo desta TASK:**
- <o que esta TASK NÃO faz — explícito pra evitar scope creep>

---

**Builder entrega:**
- <arquivo/módulo a criar ou alterar>
- <comportamento esperado>
- <constraints — ex: "sem novas dependências", "apenas no serviço X">

**Evaluator valida:**
```bash
# comandos executáveis que provam que a entrega está correta
# exemplos:
# dotnet test --filter FullyQualifiedName~UserServiceTests
# npm test -- --testPathPattern=user.service
# go test ./internal/user/...
# curl -s localhost:8080/health | jq -e '.status == "ok"'
```

**Critério de aceite:**
- [ ] Critério de sucesso declarado acima foi verificado e bate.
- [ ] Comandos do Evaluator passam sem erro.
- [ ] Cobertura da área tocada não caiu.
- [ ] Sem novos warnings de lint.
- [ ] Nada fora do "Diff esperado" foi tocado.

---

### TASK-02 — <título curto>

**Critério de sucesso (declare ANTES de codar):**
> <UMA frase verificável.>

**Diff esperado:**
- <arquivo(s)>
- Tamanho estimado: <~N linhas>

**Fora do escopo desta TASK:**
- <...>

---

**Builder entrega:**
- <...>

**Evaluator valida:**
```bash
# <...>
```

**Critério de aceite:**
- [ ] Critério de sucesso bateu.
- [ ] <...>

---

## Sensores obrigatórios ao fim do sprint

Rodar todos antes de declarar o sprint fechado:

```bash
# 1) Build limpo
<comando de build da stack>

# 2) Testes
<comando de testes>

# 3) Quality Gate
./.harness/quality-gate.sh

# 4) Compliance grep (também faz parte do gate, mas confere isolado)
./.harness/collectors/compliance-grep.sh

# 5) Sem secrets
git diff origin/main -- '*.env*' '*.json' '*.yml' | grep -iE 'token|secret|password|api[_-]?key' || true
```

---

## Critério de aceite do sprint

- [ ] Todas as TASKs com status ✅ no `Progress.md`.
- [ ] `./.harness/quality-gate.sh` exit 0.
- [ ] PR mergeado em `main` (ou branch de release).
- [ ] `Progress.md` atualizado com seção de fechamento de sprint.
- [ ] Baseline atualizado se cobertura/duplicação melhoraram (ver `plan-build/quality-gate.md`).
