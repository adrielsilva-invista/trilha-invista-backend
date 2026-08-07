# Standard: CNPJ Alfanumérico

> **Opt-in com critério.** Ative SOMENTE em projetos que validam, recebem,
> persistem ou exibem CNPJ. Em projetos que não tocam CNPJ, ignore este standard.
> Versão 1.0 — 2026-06-22
> Fonte: Instrução Normativa RFB nº 2.229/2024 (Anexo XV) + documentação técnica
> do SERPRO ("Cálculo dos dígitos verificadores de CNPJ alfanumérico").

## Critério de ativação

Este standard **não** é default-on (diferente de `clean-code.md`). Ative quando o
projeto tem **qualquer** uma destas características:

- Recebe CNPJ em borda externa (request, payload, webhook, fila).
- Persiste CNPJ em banco (coluna, índice, chave).
- Valida CNPJ em código (regra de negócio, formulário, máscara).
- Consulta bureau/fornecedor que identifica empresa por CNPJ (Serpro, Receita,
  bureaus de crédito, NF-e, etc).

**Como ativar no projeto:**

1. Descomente o bloco `cnpj_alfanumerico` no `plan-build/quality-gate.md` §3.
2. Marque no `spec.md` §4 que o projeto processa CNPJ e segue este standard.

Se o projeto **não** toca CNPJ, não há nada a fazer — os patterns ficam comentados
e o standard é inerte.

## Por que existe

A partir de **julho de 2026** a Receita Federal passa a emitir CNPJ no formato
**alfanumérico** (IN RFB nº 2.229/2024). As novas inscrições poderão conter letras
maiúsculas nas 12 primeiras posições. Os CNPJs numéricos já existentes **continuam
válidos e inalterados** — os dois formatos convivem permanentemente.

O risco para qualquer sistema da empresa: código legado valida CNPJ assumindo
"14 dígitos numéricos" (`\d{14}`, `long.Parse(cnpj)`, máscara só-numérica). Quando
um CNPJ alfanumérico chega, esse código **rejeita um cliente legítimo ou estoura
exceção**. Este standard existe para que todo projeto que toca CNPJ aceite o novo
formato desde o primeiro commit, sem retrabalho em julho/2026.

## Formato

O CNPJ continua com **14 posições**. O que muda é o conjunto de caracteres aceito:

| Posições | Nome | Conteúdo | Aceita letra? |
|---|---|---|---|
| 1–8 | Raiz | base do CNPJ | **Sim** (`0-9`, `A-Z`) |
| 9–12 | Ordem | filial/estabelecimento | **Sim** (`0-9`, `A-Z`) |
| 13–14 | DV | dígitos verificadores | **Não** — sempre numérico (`0-9`) |

- Letras são **sempre maiúsculas**, de `A` a `Z`, sem acento e sem caractere especial.
- Máscara visual permanece: `XX.XXX.XXX/XXXX-XX` (ex.: `12.ABC.345/01DE-35`).
- A Receita **recomenda** (não obriga) não emitir CNPJ com as letras `I`, `O`, `Q`, `F`
  por confusão visual. **Validação NÃO deve rejeitar** essas letras — um CNPJ que as
  contenha ainda é válido se o DV bater. Restrição de letras é problema de **emissão**,
  não de validação.

## Regras de validação (verificáveis)

1. Normalizar antes de validar: remover máscara (`.`, `/`, `-`, espaços) e aplicar
   **uppercase**. CNPJ minúsculo (`12abc34501de35`) é o mesmo CNPJ — não rejeite por caixa.
2. Após normalizar, deve ter **exatamente 14 caracteres**.
3. Posições 1–12: cada caractere ∈ `[0-9A-Z]`.
4. Posições 13–14: cada caractere ∈ `[0-9]`.
5. Os dois DVs devem bater com o cálculo (algoritmo abaixo).
6. **Não** converter CNPJ para tipo numérico (`long`, `int`, `Int64`). Trafegue,
   persista e compare como **string**. Coluna de banco: `varchar(14)`, nunca inteiro.
7. O validador alfanumérico aceita **também** o CNPJ numérico legado (para dígitos,
   o cálculo é idêntico ao algoritmo clássico). Não há dois validadores — há um só.

## Algoritmo do dígito verificador

A fórmula **não muda**: continua **módulo 11** com pesos de `2` a `9`. A única
adaptação é a conversão de cada caractere para valor numérico.

**Conversão caractere → valor:** `valor = código ASCII do caractere − 48`.

- `'0'`..`'9'` → `0`..`9` (igual ao CNPJ clássico).
- `'A'` (ASCII 65) → `17`, `'B'` → `18`, ... `'Z'` (ASCII 90) → `42`.

Em código, `(int)c - '0'` faz essa conversão diretamente (pois `'0'` é ASCII 48).

**Passos (1º DV):**

1. Tomar os **12 primeiros** caracteres e converter cada um para valor.
2. Atribuir pesos **da direita para a esquerda**, começando em `2`, subindo até `9`;
   ao passar de `9`, reiniciar em `2`.
3. Somar `valor × peso` de todas as posições.
4. `resto = soma mod 11`. Se `resto < 2` (ou seja, 0 ou 1), `DV = 0`; senão `DV = 11 − resto`.

**Passos (2º DV):** acrescentar o 1º DV ao final (formando 13 caracteres) e repetir
os passos 1–4 sobre esses 13 caracteres.

### Exemplo oficial (verificado): `12.ABC.345/01DE` → DV `35`

| Caractere | 1 | 2 | A | B | C | 3 | 4 | 5 | 0 | 1 | D | E |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Valor (ASCII−48) | 1 | 2 | 17 | 18 | 19 | 3 | 4 | 5 | 0 | 1 | 20 | 21 |
| Peso (dir.→esq.) | 5 | 4 | 3 | 2 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 |

Soma = `5+8+51+36+171+24+28+30+0+4+60+42 = 459`. `459 mod 11 = 8` → `DV1 = 11−8 = 3`.
Repetindo com o `3` anexado: soma = `424`, `424 mod 11 = 6` → `DV2 = 11−6 = 5`. Resultado: `…-35`.

## Implementação de referência (.NET 10 / C#)

> Referência, não obrigação. Stack primária da empresa é .NET. Em outras stacks,
> reimplemente seguindo a mesma spec — o algoritmo é idêntico.

```csharp
public static class CnpjAlfanumerico
{
    private const int TamanhoCnpj = 14;
    private const int TamanhoBase = 12;

    /// <summary>Valida um CNPJ numérico OU alfanumérico (IN RFB 2.229/2024).</summary>
    public static bool IsValido(string? cnpj)
    {
        if (string.IsNullOrWhiteSpace(cnpj))
            return false;

        string limpo = Normalizar(cnpj);
        if (limpo.Length != TamanhoCnpj)
            return false;

        for (int i = 0; i < TamanhoBase; i++)
            if (!CaractereBaseValido(limpo[i]))
                return false;

        if (!char.IsDigit(limpo[12]) || !char.IsDigit(limpo[13]))
            return false;

        string raiz = limpo[..TamanhoBase];
        int dv1 = CalcularDigito(raiz);
        int dv2 = CalcularDigito(raiz + dv1);

        return (limpo[12] - '0') == dv1 && (limpo[13] - '0') == dv2;
    }

    /// <summary>Remove máscara e normaliza para maiúsculas. Não valida.</summary>
    public static string Normalizar(string cnpj)
    {
        var sb = new System.Text.StringBuilder(TamanhoCnpj);
        foreach (char c in cnpj)
            if (char.IsLetterOrDigit(c))
                sb.Append(char.ToUpperInvariant(c));
        return sb.ToString();
    }

    private static bool CaractereBaseValido(char c) =>
        (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z');

    // Módulo 11, pesos 2..9 da direita para a esquerda; valor = ASCII - 48.
    private static int CalcularDigito(string baseDigitos)
    {
        int soma = 0;
        int peso = 2;
        for (int i = baseDigitos.Length - 1; i >= 0; i--)
        {
            soma += (baseDigitos[i] - '0') * peso;
            peso = peso == 9 ? 2 : peso + 1;
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
```

## Anti-patterns proibidos (compliance-grep)

Quando este standard está ativo, o bloco `cnpj_alfanumerico` do `quality-gate.md` §3
reprova o PR ao detectar validação só-numérica de CNPJ:

```yaml
cnpj_alfanumerico:
  - pattern: "(?i)cnpj[^\\n]{0,40}\\\\d\\{14\\}"
    message: "Validação de CNPJ como 14 dígitos numéricos. CNPJ é alfanumérico (IN RFB 2.229/2024) — valide como [0-9A-Z]{12}[0-9]{2}."

  - pattern: "(?i)cnpj[^\\n]{0,40}\\[0-9\\]\\{14\\}"
    message: "Validação de CNPJ como 14 dígitos numéricos. CNPJ aceita letras nas 12 primeiras posições."

  - pattern: "(?i)(long|int|Int64|Int32|ulong)\\.(Try)?Parse\\([^)]*cnpj"
    message: "CNPJ convertido para inteiro. CNPJ é alfanumérico — trafegue e persista como string."

  - pattern: "(?i)Convert\\.To(Int64|Int32|UInt64)\\([^)]*cnpj"
    message: "CNPJ convertido para inteiro. CNPJ é alfanumérico — trafegue e persista como string."

  - pattern: "(?i)cnpj[^\\n]{0,40}\\.All\\(char\\.IsDigit\\)"
    message: "CNPJ validado como só-dígitos. As 12 primeiras posições aceitam A-Z."
```

> Patterns são heurística — ajuste os globs/escape ao nome real dos campos do projeto
> se houver falso positivo. O objetivo é flagar "CNPJ tratado como número", não punir
> o uso de `\d{14}` em contextos que nada têm a ver com CNPJ.

## Validação antes de declarar "done"

- [ ] Nenhuma validação de CNPJ assume só-numérico (`\d{14}`, `IsDigit`, parse para inteiro).
- [ ] CNPJ é string em todo o caminho: borda → domínio → banco (`varchar(14)`).
- [ ] Validador aceita o exemplo oficial `12.ABC.345/01DE35` e rejeita DV errado.
- [ ] Validador continua aceitando CNPJ numérico legado (ex.: um CNPJ real existente).
- [ ] Validação normaliza caixa e máscara antes de comparar.
- [ ] `compliance-grep` zera os patterns `cnpj_alfanumerico` (se o bloco está ativo).

## Referência

- **Instrução Normativa RFB nº 2.229/2024**, Anexo XV — define o formato e o cálculo
  do DV (`normas.receita.fazenda.gov.br`).
- Receita Federal — página oficial do CNPJ Alfanumérico e "Cálculo do DV do CNPJ"
  (documentos técnicos: Manual de Cálculo do DV + arquivos de referência).
- SERPRO — "Cálculo dos dígitos verificadores de CNPJ alfanumérico".
- O exemplo `12.ABC.345/01DE-35` e a conversão ASC−48 vêm dessas fontes oficiais;
  este standard destila a regra em forma verificável e **não reproduz** material protegido.
