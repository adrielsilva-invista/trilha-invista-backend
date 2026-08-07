# Standard: Clean Code

> **Obrigatório por default em todo projeto gerado pelo harness.**
> Bypass apenas para projetos sem código humano-escrito (ver "Bypass legítimo" no fim).
> Versão 1.0 — 2026-05-22

## Escopo padrão

Este standard vem **ligado por default** no harness:

- O `spec.md` §3 já vem com "Padrões de código: **Clean Code**".
- Os patterns `clean_code` no `quality-gate.md` §3 já vêm **descomentados**.
- Sair disso exige bypass documentado.

Os patterns do compliance-grep rodam em todo o repositório (excluindo testes,
mocks e `*.example`). Em projetos que não têm código humano-escrito (workflow
visual puro, arquivo de config gerado), comente o bloco e registre o bypass
no `spec.md`.

> Este standard é **complementar** ao `clean-architecture.md`. O clean-architecture
> define **onde** o código mora. O clean-code define **como** o código é escrito
> dentro de cada arquivo.

## Por que existe

Código é lido muito mais vezes do que escrito. Cada minuto economizado escrevendo
custa horas pra cada futuro leitor — incluindo você mesmo daqui a 3 semanas.

Sem catraca de legibilidade, a IA produz código rápido e funcional que:

- Usa nomes desinformativos (`data`, `info`, `result`) e força o leitor a inferir tudo.
- Cresce em funções monstro que fazem 5 coisas porque "já que tá aqui".
- Espalha comentários que mentem (porque o código mudou e o comentário não).
- Trata erro com `catch` genérico e segue como se nada tivesse acontecido.
- Repete blocos quase-iguais com diferenças sutis que viram bug.

O objetivo aqui não é "ser fiel ao livro". É garantir que **o código gerado pelo
harness fica legível pra quem chega depois**, e que dá pra revisar uma PR sem
abrir 20 abas pra entender o que tá acontecendo.

## Princípio único, inegociável

> **Código é lido muito mais vezes do que escrito. Otimize pra leitor, não pra autor.**

Toda regra abaixo é consequência verificável dessa.

## Os 6 pilares

### 1. Nomes revelam intenção

| Regra | Exemplo ruim | Exemplo bom |
|---|---|---|
| Nome diz **o que** e **por quê** | `int d;` | `int diasDesdeUltimoPagamento;` |
| Sem nome desinformativo | `var data = ...`, `var info = ...`, `var temp = ...` | `var faturasVencidas = ...` |
| Sem prefixo húngaro | `m_count`, `_mFoo` | `count`, `_foo` |
| Sem classes genéricas | `OrderManager`, `StringHelper`, `Util` | `OrderRepository`, `StringFormatter` (ou o verbo real) |
| Pronunciável | `genymdhms` | `generatedDate` |
| Buscável (não-trivial) | `if (n > 7)` | `if (idade > IdadeMinimaCadastro)` |

### 2. Funções pequenas e focadas

- **Tamanho:** ≤ 20 linhas. Se passou, há um sub-conceito esperando virar função.
- **Argumentos:** ≤ 3. 4+ exige refactor ou objeto-parâmetro.
- **Faz UMA coisa:** se a função tem `// faz X / depois faz Y`, são duas funções.
- **Um nível de abstração:** alto-nível chama alto-nível, baixo chama baixo. Não misture.
- **Sem side effect escondido:** se a função se chama `validar()`, não pode também escrever no banco. Comando vs Query (CQS).
- **Sem flag boolean:** `processar(true)` é função dupla. Quebre em `processarUrgente()` e `processarNormal()`.

### 3. Comentários: minoria útil

> **"Não comente código ruim — reescreva."**

✅ Comentário aceitável:
- Justifica decisão não-óbvia (`// alinhado em 64 bytes pra cache hit do processador X`).
- Explica regulamento/contrato externo (`// IRS exige arredondamento half-up — ver doc fiscal`).
- TODO **rastreado** (com link de issue): `// TODO(JIRA-123): suporte a UTF-16`.
- Header de API pública (XML doc).

❌ Comentário proibido:
- Redundante: `// soma a e b` antes de `int Sum(int a, int b)`.
- Murmúrio / pra si mesmo: `// não sei se isso funciona`.
- Código comentado (apaga — git lembra).
- TODO/FIXME/HACK sem issue rastreável (cai no compliance-grep).
- Comentário desatualizado (mentira ativa).

### 4. Tratamento de erro explícito

- **Use exception**, não código de retorno. Caller decide se trata ou propaga.
- **Exception específica**, nunca `throw new Exception("...")`.
- **Catch em escopo próprio** — try/catch é a estrutura da função.
- **Nunca catch vazio** (já coberto pelo `clean_arch_dotnet`).
- **Don't return null** — use `Optional` / `Maybe` / coleção vazia / Special Case Object.
- **Don't pass null** como argumento — quebra o contrato do método.

### 5. Boundaries com código de terceiros

- Encapsule biblioteca externa atrás de **interface própria** (já coberto pelo
  Clean Architecture — `IGateway`, `IRepository`, etc.).
- **Learning tests** quando integrar API externa nova: escreva teste contra a
  lib pra documentar o que você assume sobre o comportamento dela. Se a lib
  mudar, o teste quebra antes do produto.
- **Adapter pattern** quando o contrato da lib é desconfortável — não force o
  resto do código a conhecer o formato cru.

### 6. Testes — F.I.R.S.T.

| Letra | Significa | O que verificar |
|---|---|---|
| **F**ast | Rápido | Test runner roda em segundos no projeto (alvo) |
| **I**ndependent | Independente | Ordem dos testes não importa; cada um se monta e desmonta |
| **R**epeatable | Repetível | Roda igual no laptop, CI e datacenter; sem `DateTime.Now`, sem `Random` direto |
| **S**elf-validating | Auto-validável | `assert`, não `Console.WriteLine` pro humano olhar |
| **T**imely | Em tempo | Escrito junto com (ou antes — TDD) o código de produção |

- **Um conceito por teste.** Não 3 asserts de cenários diferentes no mesmo método.
- **Nome descreve cenário:** `Deve_RecusarSaque_QuandoSaldoInsuficiente`.
- **Teste comportamento, não implementação** — não importa quais métodos privados foram chamados.

## Limites duros (números verificáveis)

| Item | Limite | Verificável por |
|---|---|---|
| Linhas por função | ≤ 20 (alvo); 40 (limite duro) | Reviewer; AST se houver |
| Argumentos por função | ≤ 3 | Reviewer |
| Aninhamento (if/for/while) | ≤ 3 níveis | Reviewer |
| Métodos públicos por classe | ≤ 7 | Reviewer |
| Linhas por arquivo | `MAX_FILE_LINES` (default 800, ver `quality-gate.md`) | Coletor `file-size.sh` (catraca) |
| Profundidade de chamada encadeada (Lei de Demeter) | ≤ 2 (`a.b().c()`); 3+ proibido | Reviewer |

> Os 5 primeiros são heurística — reviewer flagga, autor justifica ou refatora.
> Apenas `linhas por arquivo` é catraca dura via coletor.

## Checklist binário pro reviewer

Nove perguntas. Toda PR de feature passa por essas.

| # | Pergunta | Como verificar |
|---|---|---|
| 1 | Os nomes (classes, métodos, vars) revelam intenção sem precisar comentário? | Leitura. Se precisa ler o corpo pra entender o nome → falha. |
| 2 | Cada função faz uma única coisa? | Descreva em uma frase com **um único verbo**. Se aparece "e" ou "depois" → falha. |
| 3 | Argumentos ≤ 3 em toda função? | Contagem direta. |
| 4 | Zero código comentado, zero TODO/FIXME sem issue rastreada? | Compliance-grep cobre. |
| 5 | Try/catch em escopo próprio (a função inteira é o try, ou o try é uma função)? | Leitura. Try aninhado misturado com lógica → falha. |
| 6 | Zero `return null` em método que promete coleção/objeto? | Leitura. |
| 7 | Testes obedecem F.I.R.S.T.? | Rodar duas vezes em ordem aleatória → resultados iguais. |
| 8 | DRY respeitado — blocos quase-iguais foram extraídos? | Coletor `duplication.sh` (catraca). |
| 9 | Sem train wreck (`a.getB().getC().d()`)? | Heurística; reviewer confirma. |

> Falhou qualquer uma → bloqueia merge.

## Anti-patterns proibidos (compliance-grep)

Estes patterns reprovam o PR imediatamente quando aparecem em código de produção
(testes, mocks e `.example` excluídos pelo coletor — ver `quality-gate.md` §3).

```yaml
clean_code:
  - pattern: "\\b(TODO|FIXME|HACK|XXX)\\b"
    message: "TODO/FIXME/HACK em produção. Resolva ou abra issue rastreável (ex.: TODO(JIRA-123))."

  - pattern: "Console\\.WriteLine"
    message: "Use ILogger estruturado, não Console.WriteLine."

  - pattern: "throw\\s+new\\s+Exception\\("
    message: "Exception genérica. Use tipo específico ou exception de domínio."

  - pattern: "\\bm_[a-z]"
    message: "Prefixo húngaro proibido (m_). Use convenção .NET padrão (camelCase ou _prefix)."

  - pattern: "class\\s+\\w+(Manager|Helper|Util|Utility|Common|Misc)\\b"
    message: "Nome genérico (Manager/Helper/Util). Renomeie pelo verbo que a classe faz."

  - pattern: "var\\s+(data|info|temp|obj|thing|stuff|item|value)\\s*="
    message: "Nome desinformativo. Use nome que revele intenção."
```

> `catch` vazio e `NotImplementedException` já são cobertos pelo bloco `clean_arch_dotnet`
> e não são duplicados aqui.

## Bypass legítimo

Este standard é **default-on em todo projeto** gerado pelo harness. Bypass exige justificativa por escrito no `spec.md` §3.

**Casos onde o bypass é legítimo:**

| Caso | Por quê |
|---|---|
| Workflow visual puro (n8n, Zapier, Make, Power Automate) | Não há código humano-escrito onde aplicar a regra. |
| Arquivo de configuração gerado por tool (lockfile, OpenAPI gen, EF migration auto) | Forma é responsabilidade do gerador. |
| Script de migração one-shot (< 100 linhas, executado uma vez e arquivado) | Custo da legibilidade > vida útil. |
| Código experimental marcado e datado (`[Experimental]` ≤ 30 dias) | Vai ser deletado ou promovido — não merece refactor. |

**Como registrar o bypass:** no `spec.md` §3, adicione:

```
Padrões de código: Bypass de Clean Code. Motivo: <uma linha — ex.: "workflow n8n, sem código humano-escrito".>
```

**Bypass silencioso → PARE e SINALIZE.**

## Validação antes de declarar "done"

- [ ] Reviewer respondeu "sim" às 9 perguntas do checklist binário.
- [ ] `compliance-grep` zera todos os patterns `clean_code` do `quality-gate.md`.
- [ ] Coletor `duplication.sh` não piorou.
- [ ] Coletor `file-size.sh` não piorou.
- [ ] Nenhum arquivo novo ultrapassa `MAX_FILE_LINES`.
- [ ] Testes obedecem F.I.R.S.T. (roda duas vezes em ordem aleatória — resultados iguais).

## Referência

- Conceitos canônicos (nomes, funções, comentários, F.I.R.S.T., Lei de Demeter,
  Boundaries, error handling com exceptions) vêm da literatura amplamente
  difundida de engenharia de software (palestras públicas, blogs do autor,
  cursos abertos).
- Este standard **não reproduz** material com direito autoral; destila os
  princípios em regras verificáveis aplicáveis ao stack .NET 10 (e genéricas
  multi-stack onde apropriado) deste harness.
