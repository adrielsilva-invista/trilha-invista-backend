# Padrões & Anti-padrões (design de schema PostgreSQL)

Padrões de schema reutilizáveis que um DBA sênior usa, e os anti-padrões a pegar em
review. Ao revisar, exponha anti-padrões em ordem de severidade: riscos de correção
e perda de dados primeiro, performance depois, estilo por último.

## Conteúdo
- Padrões: colunas de auditoria, soft delete, optimistic locking, chaves,
  many-to-many, hierarquias, multi-tenancy, no-overlap, histórico de status
- Anti-padrões: EAV, JSON demais, FKs polimórficas, god tables, FKs sem índice,
  float pra dinheiro, timestamp-sem-tz, PKs naturais que mudam, varchar(255), sem PK

---

## Padrões

### Colunas de auditoria
Quase toda tabela de negócio se beneficia de:
```sql
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
created_by bigint REFERENCES users(id),   -- opcional: quem
updated_by bigint REFERENCES users(id)
```
Mantenha `updated_at` honesto com uma trigger (a app esquecer de setá-lo é a falha
usual):
```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### Soft delete
`deleted_at timestamptz` (NULL = viva). Filtre com `WHERE deleted_at IS NULL`, e
sustente com um **índice parcial** para que queries de linha viva fiquem rápidas:
```sql
CREATE INDEX idx_orders_live ON orders (user_id) WHERE deleted_at IS NULL;
```
Para unicidade que deve ignorar linhas deletadas, use um **índice único parcial**:
```sql
CREATE UNIQUE INDEX ux_users_email_live ON users (email) WHERE deleted_at IS NULL;
```
Ressalva: soft delete complica FKs e toda query. Use onde histórico/auditoria
importa; hard delete (ou mover para tabela de arquivo) onde não importa.

### Optimistic locking
Previna atualizações perdidas sob concorrência com uma coluna de versão:
```sql
version integer NOT NULL DEFAULT 0
```
`UPDATE ... SET ..., version = version + 1 WHERE id = $1 AND version = $2;` — zero
linhas afetadas significa que outra pessoa venceu a corrida.

### Chaves: surrogate vs natural
- Padrão para uma **PK surrogate** (`bigint IDENTITY`): estável, compacta, nunca
  precisa mudar mesmo que os dados de negócio mudem.
- Adicione uma **constraint `UNIQUE` na chave natural** (email, sku, cpf) para impor
  a regra do mundo real — você ganha tanto uma chave de join estável quanto correção.
- Use uma **PK natural** apenas quando ela for de fato imutável e você se beneficiar
  dela (ex. código de país ISO `code char(2)` como PK de uma tabela de referência
  minúscula). Nunca faça PK em algo que muda (email, telefone, username) —
  cascatear uma PK alterada por todas as FKs é sofrimento.

### Many-to-many
Tabela de junção com uma PK composta (ou surrogate + unique):
```sql
CREATE TABLE order_items (
    order_id   bigint NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity   integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(12,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
```
`CASCADE` no lado dono (deletar o pedido remove seus itens); `RESTRICT` no lado de
referência (não pode deletar um produto ainda em pedidos). Indexe ambas as colunas
FK — a PK composta cobre `order_id`; adicione `idx_order_items_product_id` para a
outra direção.

### Hierarquias / árvores
- **Adjacency list**: `parent_id bigint REFERENCES same_table(id)` — simples,
  escrita barata; leituras recursivas via `WITH RECURSIVE`. Bom default.
- **`ltree`** (extensão) para queries baseadas em caminho se você lê subárvores
  constantemente.
- Closure table para leitura pesada de conjuntos arbitrários de
  ancestrais/descendentes. Escolha pela mistura leitura/escrita; não faça
  over-engineering.

### Constraint de não-sobreposição (ranges)
Imponha reservas sem sobreposição no banco, não na app:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE reservations ADD CONSTRAINT ex_reservations_no_overlap
  EXCLUDE USING gist (room_id WITH =, during WITH &&);  -- during tstzrange
```

### Histórico de status
Quando "status atual" não é suficiente e você precisa da linha do tempo, não
sobrescreva uma coluna `status` — adicione uma tabela `status_history` (ou de
evento) com `(entity_id, status, changed_at, changed_by)` e derive o atual da linha
mais recente (ou mantenha ambos: coluna atual rápida + tabela de histórico completa).

### Multi-tenancy
Tabela compartilhada: `tenant_id bigint NOT NULL` como a coluna **líder** do índice
e parte das chaves unique (`UNIQUE (tenant_id, email)` — único por tenant).
Considere políticas de Row-Level Security chaveadas em `tenant_id` para que o
isolamento seja imposto pelo banco, não só pela app.

---

## Anti-padrões (pegue estes em review)

### EAV (Entity-Attribute-Value) — geralmente um erro
`attributes(entity_id, attribute_name, value text)` reinventa um banco dentro do seu
banco. Você perde tipos, constraints, FKs e queries legíveis; relatórios viram um
pesadelo de self-join. **Correção:** colunas reais para atributos conhecidos; uma
única coluna `jsonb` para o restante genuinamente dinâmico. EAV se justifica apenas
para sistemas de campos-definidos-pelo-usuário verdadeiramente abertos, e mesmo aí
`jsonb` geralmente vence.

### JSON demais
Dados estruturados escondidos em `jsonb` para fugir da modelagem. Sintomas: queries
cheias de `->>` filtrando/juntando em chaves JSON; sem FKs; sem `NOT NULL`.
**Correção:** promova qualquer campo em que você filtra/junta/agrega para uma
coluna; mantenha apenas a parte variável em `jsonb`.

### FKs polimórficas (`entity_type` + `entity_id`)
Um par de colunas "comments podem se anexar a posts *ou* photos *ou* videos" não
pode ter uma foreign key real, então a integridade referencial se foi. **Correção:**
colunas FK separadas com um `CHECK` de que exatamente uma está setada, ou tabelas de
ligação separadas por pai, ou uma tabela pai compartilhada.

### God tables / proliferação de colunas
Uma tabela com 60 colunas onde a maioria é `NULL` para a maioria das linhas
geralmente esconde várias entidades ou uma máquina de estados. **Correção:** divida
por entidade ou por ciclo de vida; mova grupos opcionais esparsos para tabelas
próprias ou `jsonb`.

### Foreign keys sem índice
O Postgres indexa a PK automaticamente mas **não** as colunas FK. FKs sem índice
deixam joins e — criticamente — `DELETE`/`UPDATE` de linha-pai lentos e cheios de
lock (o Postgres varre a tabela filha para checar a constraint). **Correção:**
indexe toda coluna FK em que você faz join ou que referencia um pai mutável.

### Float para dinheiro
Coberto em data-types, repetido porque é o mais danoso: `real`/`double` em moeda
**vai** causar erros contábeis no nível do centavo. **Correção:** `numeric` ou
unidades monetárias inteiras. Sinalize à primeira vista.

### `timestamp without time zone`
Silenciosamente ambíguo entre fusos/horário de verão. **Correção:** `timestamptz`
em quase todo lugar.

### Primary keys naturais mutáveis
PK em email/username/telefone, aí um usuário muda → dor em cascata por todas as FKs.
**Correção:** PK surrogate + constraint unique na chave natural.

### `varchar(255)` em todo lugar
Cargo-cult do MySQL; no Postgres o número é arbitrário e não impõe nada
significativo. **Correção:** `text` por padrão; um limite de tamanho real apenas
quando uma regra de negócio exigir, expresso como `CHECK`.

### Sem primary key
"É só uma tabela de staging/log." Quebra replicação lógica, updates por linha, e
dedup. **Correção:** sempre dê uma chave (surrogate serve).

### `char(n)` para texto variável
Preenchimento com espaços desperdiça espaço e quebra comparações. **Correção:**
`text`/`varchar`.

### Armazenar arquivos grandes em `bytea`
Incha a tabela, o WAL e os backups; deixa tudo lento. **Correção:** object storage +
uma coluna de key/URL, a menos que os blobs sejam pequenos e poucos.
