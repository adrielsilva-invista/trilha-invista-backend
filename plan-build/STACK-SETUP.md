# STACK-SETUP.md — Checklist de configuração stack-specific

> Bootstrap do harness gera coletores e CI em modo **stub** (stack-agnóstico).
> Antes do primeiro PR real, preencher os itens abaixo conforme a stack deste projeto.
> A skill `/harness` consulta este arquivo no boot e mostra ⚠ aviso visível
> enquanto houver itens não marcados.

---

## Por que existe

O harness é genérico — não sabe se você usa .NET, Node, Go ou Python. Os 3
coletores de métrica e o setup do CI vêm em branco e **precisam ser preenchidos**
pelo projeto que adota o harness. Sem isso, o gate passa silenciosamente em
modo stub (null) — qualquer degradação real não é detectada.

---

## Checklist

Marque `[x]` à medida que preencher.

- [x] **`.harness/collectors/coverage.sh`** — Jest `--coverage` (json-summary)
- [x] **`.harness/collectors/duplication.sh`** — jscpd via npx
- [x] **`.harness/collectors/lint.sh`** — ESLint `-f json`
- [x] **`.github/workflows/quality-gate.yml`** — setup-node@20 + `npm ci`
- [x] **`plan-build/quality-gate.md` §1** — TypeScript/NestJS declarado; compliance-grep adaptado C#→TS

---

## Como saber se um item está pronto

| Item | Sinal de pronto |
|---|---|
| `coverage.sh` | Roda `bash .harness/collectors/coverage.sh` e retorna `{"coverage_pct": <numero real>}`, sem `null`, sem warning STUB em stderr |
| `duplication.sh` | Idem, retorna `{"duplication_pct": <numero>}` |
| `lint.sh` | Idem, retorna `{"lint_violations": <numero>}` |
| Workflow `quality-gate.yml` | `setup-<stack>` e `install deps` sem comentários `#`, sem texto `Ajustar instalação` |
| `quality-gate.md` §1 | Zero `<PREENCHER>` na seção "Stack deste projeto" |

---

## Quando rodar o baseline inicial

Só depois que **todos os 5 itens** acima estiverem marcados:

```bash
bash .harness/quality-gate.sh --generate-baseline
git add plan-build/baseline.json plan-build/quality-gate.md plan-build/STACK-SETUP.md
git commit -m "chore: harness stack setup + initial baseline"
```

Se você gerar baseline com algum coletor ainda em stub, o `baseline.json`
nasce com `null` naquela métrica — gate sempre "skip" amarelo nela, sem catraca real.

---

## Quando deletar este arquivo

Quando **todos os 5 itens** estiverem marcados E o baseline real estiver gerado,
você pode (opcional) deletar este arquivo do projeto. A skill `/harness` deixa
de avisar quando ele some.

Manter o arquivo (mesmo todo `[x]`) é igualmente válido — vira histórico de setup.
