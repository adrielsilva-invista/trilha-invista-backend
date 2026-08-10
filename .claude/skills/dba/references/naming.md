# Convenções de Nomenclatura (PostgreSQL, snake_case, inglês)

Consistência vale mais que qualquer regra individual. Se um schema existente já
segue uma convenção diferente mas coerente, siga-a em vez de misturar duas. Estes
são os defaults para trabalho greenfield.

## Conteúdo
- Regras gerais de identificadores
- Tabelas
- Colunas
- Booleans, timestamps e colunas de auditoria
- Foreign keys
- Constraints
- Índices
- Sequences, schemas, views, functions
- Palavras reservadas a evitar
- Política de abreviação
- Nomenclatura multi-tenant

## Regras gerais de identificadores

- **snake_case minúsculo, sempre sem aspas.** O PostgreSQL rebaixa identificadores
  sem aspas para minúsculas. `CreatedAt` vira `createdat` a menos que use aspas
  duplas, e uma vez que você usa aspas você precisa usar *em todo lugar* para
  sempre. Identificadores com maiúsculas entre aspas são fonte persistente de bugs.
  Fique em minúsculas.
- **Inglês.** Mesmo para um time que fala português, identificadores em inglês
  viajam melhor entre bibliotecas, ORMs e novas contratações. (Idiomas em
  comentários/docs podem ser português; identificadores ficam em inglês.)
- **Tamanho máximo 63 bytes.** O Postgres trunca silenciosamente identificadores
  mais longos, o que pode fazer duas constraints colidirem no mesmo nome truncado.
  Mantenha nomes gerados de constraint/índice confortavelmente abaixo disso.
- **Palavras completas em vez de abreviações crípticas.** `quantity` e não `qty`,
  `description` e não `descr`. Abrevie apenas termos universalmente compreendidos
  (`id`, `url`, `ip`).

## Tabelas

- **Substantivo no plural**: `users`, `orders`, `order_items`, `payments`. Uma
  tabela guarda uma coleção; a linha é o singular. (Casas que usam tabela no
  singular existem e são válidas — só não misture.)
- **Tabelas de junção / associativas** combinam ambos os lados, geralmente plural
  da entidade dominante: `order_items`, `user_roles`, `product_tags`,
  `movie_actors`. Se o relacionamento é em si uma entidade com atributos próprios,
  dê a ele um nome de domínio: `enrollments` (não `student_courses`),
  `memberships`, `subscriptions`.
- **Sem prefixos** como `tbl_`, `t_`. O catálogo já sabe que é uma tabela.
- **Prefixe apenas para agrupar um bounded context** quando não estiver usando
  schemas, ex.: `billing_invoices`, `billing_line_items`. Prefira schemas reais
  (`billing.invoices`) quando o agrupamento for real.

## Colunas

- Singular, descritiva, inequívoca *dentro do contexto da tabela*. Dentro de
  `users`, `email` é claro; você não precisa de `user_email`.
- Evite nomes semanticamente vazios: `data`, `value`, `info`, `content`, `flag`,
  `type`, `status` **sem qualificação**. `status` sozinho é tolerável; `type`
  sozinho geralmente é um cheiro ruim — `type` de quê? Prefira `document_type`,
  `payment_method`.
- Não codifique o tipo no nome (`name_varchar`, `is_active_bool`). O catálogo
  guarda o tipo.

## Booleans, timestamps e colunas de auditoria

- **Booleans** leem-se como predicados: prefixo `is_`, `has_`, `can_`, `should_` —
  `is_active`, `has_verified_email`, `can_publish`. Evite negativas
  (`is_not_deleted`) — dupla negação em `WHERE` é propensa a erro.
- **Timestamps** (`timestamptz`) terminam em `_at`: `created_at`, `updated_at`,
  `deleted_at`, `confirmed_at`, `last_login_at`.
- **Datas** (`date`) terminam em `_on` ou `_date`: `birth_date`, `published_on`,
  `due_date`.
- **Trio de auditoria padrão** na maioria das tabelas:
  ```sql
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),  -- mantido por trigger ou app
  deleted_at timestamptz                          -- NULL = linha viva (soft delete)
  ```
  Se precisar de *quem*, adicione `created_by`/`updated_by` como FKs para `users`.

## Foreign keys

- Nome da coluna: `<tabela_referenciada_singular>_id` — `user_id` referencia
  `users(id)`, `order_id` referencia `orders(id)`.
- Quando uma tabela tem **duas FKs para o mesmo pai**, qualifique o papel:
  `sender_id` e `recipient_id` (ambos → `users(id)`),
  `origin_airport_id` / `destination_airport_id`.

## Constraints

Nomeie constraints explicitamente para que erros de violação e migrations sejam
legíveis. Os nomes autogerados do Postgres (`orders_user_id_fkey`) funcionam mas
são inconsistentes e truncam mal em tabelas de nome longo.

| Tipo          | Padrão                           | Exemplo                                   |
|---------------|----------------------------------|-------------------------------------------|
| Primary key   | `pk_<table>`                     | `pk_orders`                               |
| Foreign key   | `fk_<table>_<referenced>`        | `fk_orders_users`                         |
| Unique        | `uq_<table>_<cols>`              | `uq_users_email`                          |
| Check         | `ck_<table>_<rule>`              | `ck_orders_total_non_negative`            |
| Exclusion     | `ex_<table>_<rule>`              | `ex_rooms_no_overlap`                     |

```sql
CONSTRAINT uq_users_email UNIQUE (email),
CONSTRAINT ck_orders_total_non_negative CHECK (total_amount >= 0)
```

## Índices

- Não-único: `idx_<table>_<cols>` — `idx_orders_user_id`,
  `idx_orders_status_created_at` (composto, na ordem da chave).
- Índice único (não uma constraint): `ux_<table>_<cols>`.
- Índices parciais/funcionais: acrescente a intenção — `idx_orders_active` para
  `WHERE deleted_at IS NULL`, `idx_users_lower_email` para `(lower(email))`.
- Ordene as colunas de um índice composto por seletividade/formato da query, não
  alfabeticamente.

## Sequences, schemas, views, functions

- Com `IDENTITY` você raramente nomeia sequences diretamente. Se nomear,
  `<table>_<col>_seq`.
- **Schemas** para bounded contexts: `billing`, `analytics`, `auth`. Mantenha as
  tabelas próprias da app fora de `public` em sistemas maiores.
- **Views**: `v_<name>` é opcional; muitas casas apenas as nomeiam como tabelas e
  confiam no catálogo. Materialized views: `mv_<name>` é um sinal útil porque a
  semântica de refresh delas difere.
- **Functions/procedures**: verbo primeiro em snake_case — `calculate_invoice_total`,
  `soft_delete_order`.

## Palavras reservadas a evitar como identificadores

Reservadas em SQL ou sensíveis ao contexto, mais seguro evitar completamente:
`user`, `order`, `group`, `table`, `column`, `select`, `where`, `check`,
`default`, `primary`, `references`, `type`, `value`, `constraint`, `limit`,
`offset`, `end`, `case`, `desc`, `asc`, `all`, `any`, `array`.

Trocas comuns: `users`/`accounts`/`app_users` para user; `orders` (o plural
desvia do problema meio-reservado do singular); `order_items` para line items;
`groups` tecnicamente funciona mas `teams`/`segments` é mais claro. Na dúvida,
pluralize ou adicione um qualificador de domínio.

## Política de abreviação

Permitidas por serem universais: `id`, `url`, `uri`, `ip`, `html`, `css`,
`sku`, `iso`, `utc`. Todo o resto: escreva por extenso. `qty`→`quantity`,
`amt`→`amount`, `num`→`number`, `addr`→`address`, `dob`→`birth_date`.

## Nomenclatura multi-tenant

- **Tabela compartilhada (coluna tenant_id)**: toda tabela com escopo de tenant
  carrega `tenant_id bigint NOT NULL REFERENCES tenants(id)`, e é a coluna
  **líder** da maioria dos índices e frequentemente parte de constraints unique
  compostas (`uq_users_tenant_email UNIQUE (tenant_id, email)` — email é único *por
  tenant*, não globalmente). Considere Row-Level Security chaveado em `tenant_id`.
- **Schema por tenant**: schema nomeado pelo slug do tenant (`tenant_acme.orders`).
  A nomenclatura dentro de cada schema permanece idêntica.
