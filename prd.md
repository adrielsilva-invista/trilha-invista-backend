# PRD — Classificador Inteligente de Chamados

**Autor:** PM (via entrevista) · **Stakeholder:** adriel · **Data:** 2026-08-07 · **Status:** pronto para desenvolvimento — 1 ponto aberto (Anexo A, taxonomia) a fechar no design

> Projeto de **estudo/portfólio** dentro de uma trilha de onboarding. A dor é **hipótese** — não há dado de produção. Métricas de negócio ficam marcadas como `[hipótese]`; o valor real do documento está no escopo executável e nos critérios de aceite testáveis.

## 1. Resumo

Sistema que recebe chamados escritos em linguagem natural e usa IA para classificá-los automaticamente (categoria, área, prioridade, sentimento e resumo), eliminando a triagem manual inicial. O chamado classificado é atribuído automaticamente ao funcionário com menor carga. O funcionário revisa, pode reclassificar e conduz a resolução. Sucesso = fluxo ponta a ponta funcionando com testes, e taxa razoável de concordância entre a classificação da IA e a decisão final do funcionário.

## 2. Problema e contexto

Hoje (cenário hipotético do exercício), um humano precisa ler cada chamado e decidir manualmente prioridade e destino antes de qualquer atendimento. Isso é lento e não escala. `[hipótese]`

Custo de não fazer nada: triagem manual permanece o gargalo; chamados urgentes podem esperar na fila junto com dúvidas triviais.

Por que agora: é o objetivo da trilha de onboarding — demonstrar integração de IA a um fluxo de negócio real (auth, filas, tratamento de erro, auditoria).

## 3. Usuário-alvo

| Perfil | O que faz | Volume estimado |
|---|---|---|
| **Cliente** | Abre chamado em texto livre; acompanha os próprios chamados | `[hipótese]` |
| **Funcionário** (área Suporte) | Recebe chamados atribuídos automaticamente; lê a classificação da IA; reclassifica se discordar; muda status até resolver | `[hipótese]` — poucos, para o exercício |
| **Admin** | Cria e gerencia usuários | 1 |

Todo funcionário pertence à mesma área (Suporte). Por isso a `area` classificada pela IA é **informativa**, não roteia a atribuição.

Na ausência da solução: um humano lê e classifica cada chamado manualmente.

## 4. Métricas de sucesso

> **Enquadramento:** a taxa de concordância é uma **métrica de avaliação do classificador** (consistência IA × decisão humana), não uma prova de sucesso de negócio. Em portfólio ela demonstra que o pipeline funciona e onde o modelo erra — não que o produto tem valor de mercado.

| Métrica | Baseline | Alvo | Prazo | Como medir |
|---|---|---|---|---|
| Taxa de concordância IA × funcionário (**por campo**) | `[hipótese — sem baseline]` | ≥80% de campos concordantes | — | query/script sobre dados de seed (ver definição abaixo) |
| Fluxo ponta a ponta operante | 0 | fluxo completo cliente→IA→atribuição→resolução com testes passando | — | suíte de testes (unit + e2e do fluxo) verde |
| Nenhum chamado perdido por rate limit sob 10 simultâneos | — | 0 chamados perdidos; 429 eventuais tratados por retry/fallback (RF-05) | — | fila sequencial; log de erros de rate limit |

### Definição da taxa de concordância (por campo)

A unidade da métrica é o **campo**, não o chamado. Cada chamado classificado gera **4 comparações** independentes entre a classificação original da IA e a classificação final do funcionário:

| Campo | Concorda quando |
|---|---|
| `categoria` | valor final == valor da IA |
| `prioridade` | valor final == valor da IA |
| `area` | valor final == valor da IA |
| `sentimento` | valor final == valor da IA |

`taxa = campos concordantes / total de campos avaliados` (total = 4 × nº de chamados **que tiveram classificação da IA** e foram revisados). Chamados que caíram no caminho manual (RF-05, sem classificação da IA) **não entram** no denominador — não há par IA × humano a comparar. O alvo ≥80% é **global** — aplicado sobre o total de campos, um número só. Alvo por campo (categoria ≥X%, sentimento ≥Y%, etc.) fica para avaliação futura, quando houver volume que justifique tratar campos mais subjetivos de forma diferente.

**Fonte dos dados (sem tabela nem endpoint novos):** a comparação usa os dois lados que já existem no modelo — a **classificação original da IA** (imutável, RF-04) e o `resultado_classificacao` (classificação final, que a reclassificação atualiza, RF-08). A métrica é uma **agregação em tempo de leitura**: para cada chamado elegível, comparar `original == final` nos 4 campos. Não há serviço que "produz o número" nem tabela de resultado de comparação — a v1 **não** expõe endpoint/relatório de concordância.

**Instrumento de medição:** query/script rodado sobre os **dados de seed/teste**. Um QA verifica o alvo rodando a query sobre o seed conhecido. A concordância é **demonstrada com dados de teste, não de produção** — não há uso real em portfólio (ver premissa na seção 10).

**O que conta como "revisado" (denominador):** um chamado entra no cálculo quando teve classificação da IA **e** seu status avançou além de `ABERTO` — ou seja, está em `EM_ATENDIMENTO` ou `RESOLVIDO`. O funcionário só move o status depois de olhar o chamado, então a transição já serve de sinal de revisão — sem campo novo. Chamados ainda em `ABERTO` (recém-atribuídos, nunca abertos pelo funcionário) **não entram**: contá-los inflaria a taxa com concordâncias falsas (`final == original` só porque ninguém mexeu). Esse sinal é reforçado por RF-08, que **proíbe** transitar para `EM_ATENDIMENTO` sem classificação final válida — logo "revisado" implica que os campos foram vistos.

> **Limite conhecido deste sinal:** a transição prova que o funcionário abriu o chamado, não que leu cada campo com atenção. Um funcionário que avance sem conferir gera concordância aparente. Aceitável em portfólio (o sinal mais forte — `revisado_em` explícito por campo — fica para versão com uso real); registrado como risco na seção 10.

**Tamanho mínimo e composição do dataset:** a taxa só é reportável sobre **≥ 20 chamados revisados** (80 comparações de campo). Abaixo disso o número é ruído e não deve ser apresentado como resultado. <!-- ponytail: 20 é o mínimo para o número não oscilar absurdamente; subir se o seed crescer. --> O resultado é reportado **global** (critério de aceite) **e quebrado por campo** (`categoria`/`prioridade`/`area`/`sentimento`) — o por-campo é só diagnóstico, mas é o que evita um global de 80% esconder um campo inutilizável (ex.: sentimento em 20%).

> **Não-objetivo de metodologia:** ground truth rotulado por terceiro e conjunto de avaliação formalmente separado dos exemplos do prompt ficam **fora da v1** — são cerimônia de ML sem retorno em portfólio. A v1 compara a classificação da IA com a decisão do próprio funcionário sobre o seed. Se o seed foi usado para calibrar o prompt, a taxa mede consistência, não generalização — registrado como limite, não corrigido na v1.

**Por que por campo, e não por chamado (all-or-nothing):** o funcionário reclassifica **campo a campo** — se ele corrige só a `prioridade` e mantém os outros 3, o erro da IA foi de 1 campo, não do chamado inteiro. Contar por chamado trataria "errou 1" e "errou 4" como o mesmo resultado (chamado discordante), perdendo justamente o sinal de **onde** e **quanto** o modelo erra. Errar 2 campos conta como 2 discordâncias em 2 comparações — é o que permite ver que, por exemplo, `sentimento` erra muito e `categoria` quase nunca. Esse detalhamento por campo é o que alimenta o ajuste de prompt e o fine-tuning futuro.

**Métrica de guarda-corpo:** a falha da IA não pode **impedir o atendimento** do chamado. Por design assíncrono o chamado já nasce sem classificação (RF-03), então a criação nunca depende da Anthropic; o guarda-corpo é que, mesmo esgotados os retries (RF-05), o chamado seja **atribuído e classificado manualmente** e siga o ciclo normal — nunca fica preso por causa da IA.

> Observação: a taxa de concordância só é mensurável **depois** que houver funcionários reclassificando volume real. Em portfólio, tratar como métrica demonstrável, não como meta de produção.

## 5. Escopo — requisitos funcionais

### RF-01 — Autenticação e perfis · `Must`
**História:** Como usuário, quero fazer login, para acessar as funções do meu perfil.
**Critérios de aceite:**
- Dado um usuário válido, quando faz login, então recebe acesso conforme seu perfil (Cliente / Funcionário / Admin).
- Dado um usuário sem permissão, quando tenta uma ação de outro perfil, então recebe 403.

### RF-02 — Admin cria usuários · `Must`
**História:** Como admin, quero criar usuários, para habilitar clientes e funcionários no sistema.
**Critérios de aceite:**
- Dado admin autenticado, quando cria um usuário com perfil, então o usuário passa a existir e conseguir logar.
- Dado um não-admin, quando tenta criar usuário, então a ação é negada.
- **Escopo v1:** apenas **criação**. Editar, desativar e excluir usuários ficam **fora da v1** (ver não-objetivos). Consequência: nenhum funcionário desaparece, o que sustenta a premissa de RF-07 (todo chamado sempre tem a quem atribuir).

### RF-03 — Cliente abre chamado · `Must`
**História:** Como cliente, quero abrir um chamado em texto livre, para pedir atendimento.
**Critérios de aceite:**
- Dado cliente autenticado, quando envia um chamado com texto, então o chamado é criado com status `AGUARDANDO_CLASSIFICACAO` e enfileirado para classificação (RF-06). O status `ABERTO` só é atingido **depois** da classificação (RF-04) ou da classificação manual (RF-05/RF-09).
- Dado um texto **vazio ou só com espaços em branco**, quando tenta criar, então recebe erro de validação (400).
- Dado um texto que, **após `trim`, tenha menos de 1 ou mais de 5.000 caracteres**, quando tenta criar, então recebe erro de validação (400). <!-- ponytail: limite fixo de 5.000; se aparecer chamado legítimo maior, mover para config. -->
- O texto do cliente é **dado não confiável**: é tratado como conteúdo a classificar, nunca como instrução ao sistema/modelo (ver RF-04).

### RF-04 — Classificação automática por IA (assíncrona) · `Must`
**História:** Como sistema, quero classificar o chamado a partir da fila, para eliminar a triagem manual sem fazer o cliente esperar a IA.
**Critérios de aceite:**
- Dado um chamado na fila, quando o worker o processa, então chama a **API da Anthropic (Claude)** usando **tool use** (JSON Schema com os enums abaixo, via `tool_choice` forçado), garantindo resposta no formato esperado:
  - `categoria` ∈ `PROBLEMA_TECNICO`, `DUVIDA`, `RECLAMACAO`, `SOLICITACAO`, `OUTROS`
  - `prioridade` ∈ `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`
  - `area` ∈ `ENGENHARIA`, `QUALIDADE`, `LOGISTICA`, `COMERCIAL`, `SUPORTE_TECNICO`, `OUTROS`
  - `sentimento` ∈ `POSITIVO`, `NEUTRO`, `NEGATIVO`, `FRUSTRADO`
  - `resumo` — síntese factual do problema, **máx. 300 caracteres**, sem adicionar informação que não esteja no chamado. É **read-only** (nem funcionário nem cliente editam), visível a **funcionário e admin**, **não** exibido ao cliente e **não** entra na métrica de concordância (seção 4).
- A **semântica** de cada valor de enum (quando usar `DUVIDA` vs `SOLICITACAO`, `ALTA` vs `CRITICA`, `NEGATIVO` vs `FRUSTRADO`, fronteira `SUPORTE_TECNICO`/`ENGENHARIA`, categoria dominante quando o chamado mistura problema + reclamação) segue a **matriz de taxonomia do Anexo A**. `[ABERTO: matriz de taxonomia — definição + exemplo + contraexemplo por valor — a resolver no design técnico; quem responde: stakeholder]`. tool use garante o **formato**, não a **correção semântica** — sem a matriz, a concordância mede consistência, não acerto.
- O texto do chamado é **entrada não confiável**: instruções contidas no texto do cliente **não** podem alterar o schema, as regras de classificação ou o prompt de sistema (defesa contra prompt injection).
- Dada a resposta, quando validada no backend, então cada campo é confirmado dentro do enum. Com tool use o enum já é garantido pelo schema; a validação no backend é **rede de segurança** (defesa em profundidade), não o caminho de falha esperado. Valor fora do enum, se ocorrer, é tratado como falha (ver RF-05).
- Dada a classificação válida, quando salva, então o chamado é **atribuído (RF-07)** e só então transita `AGUARDANDO_CLASSIFICACAO → ABERTO`; a classificação fica registrada como **original da IA** (imutável, para comparação futura).

### RF-05 — Tolerância a falha da IA · `Must`
**História:** Como sistema, quero não travar o chamado se a IA falhar, para o cliente nunca ser bloqueado.
**Critérios de aceite:**
- Cada chamada à Anthropic tem **timeout** (configurável). Estourar o timeout conta como falha transitória.
- Dada uma falha **transitória** (timeout, HTTP 429, HTTP 5xx ou — improvável, dado o tool use — valor fora do enum), quando ocorre, então o worker faz **1 tentativa adicional**.
- Dada uma falha **não transitória** (HTTP 401/403 — credencial/permissão), quando ocorre, então **não** há retry (repetir não ajuda); vai direto para classificação manual e registra o erro no log operacional.
- Dado que a tentativa adicional também falha (ou a falha era não transitória), quando ocorre, então o chamado **permanece em `AGUARDANDO_CLASSIFICACAO`**, recebe o flag `classificacao_manual_pendente = true`, é **atribuído a um funcionário (RF-07)** e fica marcado para **classificação manual**.
- Em nenhum caso a falha da IA impede a criação do chamado — ele já foi persistido na abertura (RF-03) — nem elimina/invalida o chamado.

### RF-06 — Fila com processamento sequencial · `Must`
**História:** Como sistema, quero enfileirar as classificações, para não estourar o rate limit da Anthropic sob concorrência.
**Critérios de aceite:**
- Dado que o cliente cria um chamado, quando a requisição é respondida, então o chamado já está **persistido em `AGUARDANDO_CLASSIFICACAO`** e enfileirado — a resposta HTTP **não** espera a Anthropic.
- Dados até 10 chamados criados simultaneamente, quando processados, então as chamadas à Anthropic ocorrem de forma **serializada pelo worker**, sem erro de rate limit.
- Dado um chamado na fila, quando aguarda ou está sendo processado, então seu status é `AGUARDANDO_CLASSIFICACAO`.
- O status `AGUARDANDO_CLASSIFICACAO` abrange **dois** sub-estados distinguidos pelo flag `classificacao_manual_pendente`: (a) **na fila / em processamento** pela IA (flag falso) e (b) **aguardando classificação manual** após esgotar os retries (flag verdadeiro, RF-05). O status sozinho não implica que o chamado esteja na fila — só o flag distingue.
- **Idempotência:** o processamento é idempotente por `chamado_id`. Reentrega ou reexecução de um job **já concluído** não gera nova classificação, nova atribuição nem nova transição de status. Antes de persistir o resultado da IA, o worker **reconfirma** que o chamado ainda está elegível — `AGUARDANDO_CLASSIFICACAO` e não `CANCELADO`; se não estiver (ex.: cancelado durante o processamento, RF-09), o resultado é **descartado** sem classificar nem atribuir.
- **Reinício do worker:** chamados persistidos aguardando classificação não podem sumir — um chamado sem job concluído volta a ser elegível e é reprocessado (a idempotência acima cobre a reentrega).

### RF-07 — Atribuição automática por menor carga · `Must`
**História:** Como sistema, quero atribuir o chamado ao funcionário com menos chamados **ativos** (não `RESOLVIDO`/`CANCELADO`), para balancear a carga.
**Critérios de aceite:**
- Dado um chamado classificado pela IA (RF-04) **ou** marcado para classificação manual (RF-05), quando processado, então é **atribuído antes** de transitar para `ABERTO` — a atribuição faz parte da saída da fila, não uma etapa posterior.
- Quando atribuído, vai ao funcionário com o **menor número de chamados sob sua responsabilidade** — contam-se os chamados **já atribuídos a ele** com status ∉ {`RESOLVIDO`, `CANCELADO`} (inclui os que estão em `AGUARDANDO_CLASSIFICACAO` aguardando classificação manual, pois já têm responsável).
- Dado empate na contagem, quando atribui, então usa desempate por **menor id de usuário** (determinístico).
- **Consistência sob concorrência:** por RF-06 o worker processa a fila **sequencialmente**, então não há duas atribuições simultâneas competindo pela mesma contagem de carga — a leitura da carga e a persistência da atribuição são, na prática, uma operação serial. (Caso a v1 evolua para múltiplos workers, a seleção+persistência precisará virar operação atômica; fora do escopo agora.)
- Dada uma atribuição, quando efetivada, então é registrada no histórico do chamado como evento `ATRIBUICAO` (RF-11).
- **Premissa:** clientes só passam a existir depois de haver ao menos um funcionário (RF-02). Logo todo chamado sempre encontra um funcionário para atribuir — o caso "sem funcionário" não é tratado na v1.

### RF-08 — Funcionário revisa e reclassifica · `Must`
**História:** Como funcionário, quero revisar e corrigir a classificação da IA, para tratar o chamado corretamente.
**Critérios de aceite:**
- **Autorização:** um funcionário só pode **visualizar, classificar, reclassificar e mudar o status** de chamados **atribuídos a ele**. Tentativa em chamado de outro funcionário → 403.
- Chamados atribuídos com `classificacao_manual_pendente = true` (RF-05) aparecem na lista do funcionário com indicação explícita **"Classificação necessária"**.
- Um chamado **não** pode transitar para `EM_ATENDIMENTO` (RF-09) **antes de ter classificação final válida** — isso garante que o funcionário viu os campos antes de avançar (a transição é o sinal de "revisado" da métrica, seção 4).
- Dado um chamado atribuído **com classificação da IA**, quando o funcionário abre, então vê a classificação original da IA e o texto do chamado.
- Dado um chamado atribuído **sem classificação da IA** (caiu no caminho manual, RF-05), quando o funcionário abre, então vê o texto do chamado e os campos **vazios**, e classifica do zero (dentro dos enums). Como não houve classificação da IA, este chamado **não entra** no cálculo da taxa de concordância (não há par IA × humano a comparar).
- Dado que o funcionário discorda, quando altera um dos campos (dentro dos enums), então a classificação final é atualizada e a original da IA é **preservada** para comparação. Cada alteração é registrada no histórico do chamado (RF-11).

### RF-09 — Ciclo de status do chamado · `Must`
**História:** Como funcionário, quero mudar o status do chamado, para refletir o andamento.
**Critérios de aceite:**
- Ciclo completo: `AGUARDANDO_CLASSIFICACAO → ABERTO → EM_ATENDIMENTO → RESOLVIDO`, com `CANCELADO` possível a partir de qualquer estado não final.
- O sistema move `AGUARDANDO_CLASSIFICACAO → ABERTO` (via IA, RF-04, precedida da atribuição RF-07). O funcionário conduz `ABERTO → EM_ATENDIMENTO → RESOLVIDO`. Um chamado que ficou sem classificação (RF-05) segue em `AGUARDANDO_CLASSIFICACAO`; quando o funcionário salva a classificação manual, o chamado move automaticamente para `ABERTO`.
- **Cancelamento:** apenas o **Admin** pode cancelar, e a partir de qualquer estado não final (inclui `AGUARDANDO_CLASSIFICACAO`). Cliente e funcionário não cancelam.
- **Cancelado durante o processamento da IA:** se um chamado é cancelado enquanto está na fila/em processamento, o worker, ao reconfirmar elegibilidade antes de persistir (RF-06), **descarta** o resultado — não classifica, não atribui, não reabre. Se a IA terminar depois do cancelamento, o chamado permanece `CANCELADO`.
- `RESOLVIDO` e `CANCELADO` são **finais**: não aceitam reclassificação nem nova transição. Tentativa → rejeitada.
- Dada uma transição inválida, quando tentada, então é rejeitada.
- A etapa de "resolver" é abstrata (o exercício assume que o funcionário resolve fora do sistema); o critério testável é a **transição** `EM_ATENDIMENTO → RESOLVIDO`, não a resolução em si.

### RF-10 — Cliente acompanha seus chamados · `Should`
**História:** Como cliente, quero ver meus chamados e status, para acompanhar.
**Critérios de aceite:**
- Dado cliente autenticado, quando lista, então vê **apenas os próprios** chamados com status atual.

### RF-11 — Histórico do chamado (log de eventos) · `Must`
**História:** Como sistema, quero registrar o histórico de cada chamado, para servir de tracing/auditoria, alimentar a métrica de concordância e habilitar análise do modelo (e fine-tuning futuro).
**Contexto:** cada chamado tem uma trilha imutável de eventos, em ordem cronológica. Um evento nunca é editado nem apagado — reclassificar gera **um novo evento**, não sobrescreve o anterior. É daqui que sai a comparação IA × funcionário (métrica da seção 4) e o material de análise do modelo.
**Critérios de aceite:**
- Dado que a IA classifica um chamado (RF-04), quando salva, então é registrado um evento `CLASSIFICACAO_IA` com: os 4 campos classificados, o texto de entrada, modelo/versão usado, número da tentativa e timestamp.
- Dada uma falha de classificação (RF-05), quando ocorre, então é registrado um evento `FALHA_CLASSIFICACAO` com o motivo (erro de API / timeout / valor fora do enum), a tentativa e o timestamp.
- Dado que o funcionário reclassifica um campo (RF-08), quando salva, então é registrado um evento `RECLASSIFICACAO` **por alteração**, com: campo alterado, valor **antes → depois**, autor (id do funcionário) e timestamp. Ex.: "`area`: `LOGISTICA → SUPORTE_TECNICO` por usuário 7 em 2026-08-06T14:22Z".
- Dada uma atribuição a um funcionário (RF-07), quando ocorre, então é registrado um evento `ATRIBUICAO` com o funcionário destino (id), o critério (menor carga / desempate por id) e timestamp.
- Dada uma transição de status (RF-09), quando ocorre, então é registrado um evento `MUDANCA_STATUS` com status **antes → depois**, autor (funcionário, ou "sistema" quando automática) e timestamp.
- Dado um **admin**, quando consulta o histórico de um chamado, então vê **todos** os eventos em ordem cronológica (classificação da IA, falhas, reclassificações de qualquer funcionário, mudanças de status).
- Dado um **funcionário**, quando abre um chamado atribuído a ele, então vê a **classificação original da IA** e as **próprias reclassificações** (o que ele mudou, de → para) — não o log completo de auditoria.
- Dado um **cliente**, então **não** tem acesso ao histórico (vê apenas status atual, RF-10).

## 6. Não-objetivos

- **RAG / base de conhecimento interna** — fora; fica para evolução futura. A v1 usa só a chamada direta à Anthropic com o texto do chamado.
- **Roteamento por área** — fora; todo funcionário é Suporte, a `area` é apenas informativa.
- **Loop de fine-tuning / re-treino a partir do feedback** — fora; a v1 **registra** o histórico completo (RF-11) que servirá de dataset, mas não retroalimenta o modelo. O consumo desses dados (exportar dataset, treinar, avaliar) fica para evolução futura.
- **Notificações (e-mail/push) ao cliente ou funcionário** — fora da v1; o acompanhamento é por consulta (RF-10).
- **Multi-instância / alta disponibilidade** — fora; single-instance basta para portfólio.
- **SLA de tempo de atendimento / escalonamento por prioridade** — fora; prioridade é exibida, não dispara automação.
- **Gestão completa de usuários** — fora; RF-02 só **cria**. Editar, desativar e excluir usuários ficam para depois (é o que sustenta a premissa "sempre há funcionário", RF-07).
- **Edição do resumo da IA** — fora; `resumo` é read-only na v1 (RF-04).
- **Metodologia formal de avaliação de ML** — fora; ground truth rotulado por terceiro e conjunto de avaliação separado dos exemplos do prompt ficam para versão com uso real (ver seção 4).

## 7. Requisitos não funcionais

| Categoria | Requisito | Justificativa |
|---|---|---|
| Escala | Até 10 chamados simultâneos, single-instance | Alvo declarado; suficiente para demonstração |
| Performance (síncrono) | Criação e listagem de chamados respondem em **p95 < 500 ms**, excluído o processamento assíncrono da IA | A criação não depende da Anthropic (RF-06); só o rota síncrona tem alvo. Latência da classificação é dominada pela API externa e não tem alvo rígido |
| Disponibilidade parcial | Criar e listar chamados continuam operando mesmo com a Anthropic indisponível | Consequência do design assíncrono; a IA não é ponto único de falha |
| Integrações | Fila serializa chamadas à Anthropic; ao falhar de forma transitória, faz 1 retry e degrada para "sem classificação"; erro não transitório (401/403) não faz retry | Protege contra rate limit e indisponibilidade da API externa (RF-05/RF-06) |
| Segurança e acesso | Autorização **aplicada no backend** por perfil (Cliente/Funcionário/Admin); cliente só vê os próprios chamados; funcionário só opera chamados atribuídos a ele (RF-08); histórico completo (RF-11) restrito ao admin. Senhas armazenadas com **hash** (nunca em claro); secret da Anthropic **fora do frontend e do repositório**; proteção contra **IDOR** (acesso a recurso de outro usuário → 403); conteúdo exibido é **escapado/sanitizado**; texto do chamado tratado como entrada não confiável ao modelo (RF-04) | Trust boundary; demonstra RBAC e baseline de segurança |
| Auditoria | Histórico de eventos por chamado, imutável e append-only (RF-11): classificação da IA, falhas, reclassificações campo-a-campo e transições de status, cada um com autor e timestamp | Habilita a métrica de concordância, o tracing do ciclo de vida e o dataset para análise/fine-tuning futuro |
| Observabilidade | Log de falhas de classificação e de erros de rate limit | Necessário para medir a métrica de robustez |
| Acessibilidade | Básico na v1: HTML semântico; controles principais operáveis por **teclado**, com **foco visível** e **labels acessíveis**; contraste de texto normal **≥ 4.5:1** | Baseline mensurável; conformidade WCAG 2.1 AA completa fica para versão mais madura |
| Dados e privacidade | Básico na v1: dados de exercício (sem PII real); tratar texto do chamado como potencialmente sensível — sem log do conteúdo em claro fora do necessário. O evento `CLASSIFICACAO_IA` (RF-11) **registra o texto de entrada** — aceitável com dado fictício; em produção, preferir referência ao chamado em vez de duplicar o conteúdo | LGPD formal (base legal, retenção, direito de exclusão) e minimização de duplicação de PII ficam para versão com dado real |

**Categorias avaliadas e não críticas para a v1:** Disponibilidade/SLA formal (projeto de estudo, sem uso 24/7), Performance p95/p99 (latência dominada pela Anthropic, sem alvo rígido), multi-região e custo de infra.

## 8. Restrições

- **Time:** você sozinho.
- **Prazo:** sem data fixa. MoSCoW ordena prioridade, não cronograma.
- **Contexto:** entrega de trilha de onboarding.
- **Stack (fixada pela trilha):** NestJS + Prisma + PostgreSQL (backend), Next.js/React (frontend), Anthropic API / Claude (classificação), Jest (testes).
- **Dependência externa:** Anthropic API (rate limit e disponibilidade fora do seu controle → tratado por fila + retry).

## 9. Tradeoffs e decisões

| # | Tensão | Decisão | Opção rejeitada e motivo | Quem decidiu |
|---|---|---|---|---|
| 1 | Automação total × humano no loop | Humano no loop: IA sugere, funcionário revisa e pode reclassificar | Automação total — rejeitada: sem base para confiar cegamente na IA num exercício, e a reclassificação vira a métrica de concordância | stakeholder |
| 2 | Bloquear chamado até classificar × deixar passar sem classificação | Deixar passar após 1 retry | Bloquear — rejeitada: violaria o guarda-corpo (cliente nunca deve ser impedido de abrir chamado) | stakeholder |
| 3 | Classificar em paralelo × fila sequencial | Fila sequencial | Paralelo — rejeitada: estoura rate limit da Anthropic sob concorrência | stakeholder |
| 4 | Roteamento por área × atribuição só por carga | Só por carga (menor nº de chamados abertos) | Por área — rejeitada: todo funcionário é Suporte, área não discrimina | stakeholder |
| 5 | Classificar na criação (síncrono) × via fila (assíncrono) | Assíncrono: chamado nasce em `AGUARDANDO_CLASSIFICACAO`, worker classifica e move para `ABERTO` | Síncrono — rejeitada: faria o cliente esperar a latência da IA e reabriria o risco de rate limit sob 10 simultâneos; incoerente com a fila (tradeoff 3) | stakeholder |
| 6 | Confiar no texto livre da IA × tool use | tool use (JSON Schema com enums) + validação no backend | Texto livre + parsing — rejeitada: frágil, gera valores fora do enum e vira o principal caso de falha do RF-05 | stakeholder |

## 10. Riscos e premissas

| Risco / premissa | Impacto | Probabilidade | Mitigação ou plano B |
|---|---|---|---|
| IA retorna valor fora do enum | Classificação inválida | Baixa | tool use (RF-04) + validação estrita + retry + degradar para "sem classificação" (RF-05) |
| Rate limit da Anthropic sob pico | Chamados não classificam | Média | Fila sequencial (RF-06) |
| Taxa de concordância baixa demais para demonstrar valor | Métrica principal fraca | `[hipótese]` | Ajuste de prompt; documentar como aprendizado |
| Seed com poucos chamados revisados torna a taxa estatisticamente frágil | Métrica sensível a ruído (ex.: 2 chamados = 8 campos; 1 erro move 12,5%) | Média | Mínimo de **20 chamados revisados** antes de reportar a taxa (seção 4) |
| "Revisado" = status além de `ABERTO` não prova leitura atenta dos campos | Concordância aparente infla a taxa se o funcionário avançar sem conferir | Média | RF-08 bloqueia `→ EM_ATENDIMENTO` sem classificação válida; sinal mais forte (`revisado_em`) fica para versão com uso real |
| Seed usado para calibrar o prompt e depois para medir | Taxa mede consistência, não generalização | Média | Aceito em portfólio e documentado; separação formal de conjuntos fica para o futuro (seção 4) |
| Rate limit por tokens/minuto ou key compartilhada, mesmo com fila sequencial | Chamado não classifica | Baixa | 429 cai na política de retry/fallback (RF-05); fila reduz, não elimina o risco |
| Premissa: a dor de triagem manual existe | Justificativa do projeto | — | É hipótese assumida; aceitável em portfólio |
| Premissa: a taxa de concordância é medida sobre **dados de seed/teste**, não de produção | Métrica principal não tem uso real por trás | — | Portfólio não tem volume de produção; a taxa é demonstrada via query sobre o seed. Definição de "revisado" = status além de `ABERTO` (seção 4) |
| Premissa: dados são fictícios (sem PII real) | LGPD formal dispensada na v1 | — | Confirmado pelo stakeholder; LGPD completa fica para versão com dado real |
| Premissa: só há clientes depois de haver funcionário | Todo chamado sempre tem a quem atribuir | — | Confirmada; simplifica RF-07 |

## 11. Faseamento

- **v1 (esta entrega):** RF-01 a RF-09 e RF-11 (`Must`) + RF-10 (`Should`). Fluxo completo cliente→IA→fila→atribuição→revisão→resolução, com histórico de eventos e testes.
- **Depois (não-objetivos):** RAG/base de conhecimento, consumo do histórico para re-treino/fine-tuning do modelo, notificações. Gatilho para a fase seguinte: v1 estável e demonstrada na trilha.

## 12. Pontos abertos

**Um ponto aberto** remanescente, a resolver no design técnico:

| Ponto aberto | Encaminhamento | Quem responde |
|---|---|---|
| **Anexo A — matriz de taxonomia** (quando usar cada valor de `categoria`/`prioridade`/`area`/`sentimento`: definição + exemplo + contraexemplo; categoria dominante em chamado misto) | `[ABERTO]` — resolver no design; sem ela a métrica mede consistência, não acerto (RF-04, seção 4) | stakeholder |

Demais decisões, fechadas nas entrevistas:

| Decisão | Resolução |
|---|---|
| Unidade da métrica de concordância | **por campo** (4 campos/chamado); errar 2 campos = 2 discordâncias |
| Campos avaliados na métrica | categoria, prioridade, area, sentimento |
| Alvo de concordância | ≥80% dos campos, **global** (alvo por campo fica para o futuro) |
| Como calcular a concordância | agregação em leitura sobre IA original × `resultado_classificacao`; query sobre dados de seed; sem endpoint na v1 |
| O que conta como "revisado" | status além de `ABERTO` (`EM_ATENDIMENTO`/`RESOLVIDO`); chamado em `ABERTO` não entra no denominador |
| Tamanho mínimo do dataset de avaliação | ≥ 20 chamados revisados (80 comparações) antes de reportar a taxa |
| Reporte da métrica | global (critério de aceite) + por campo (diagnóstico) |
| Retry da IA | 1 tentativa extra só para falhas transitórias (timeout/429/5xx); 401/403 não repete |
| Idempotência do worker | por `chamado_id`; reconfirma elegibilidade antes de persistir; reinício não perde chamado |
| Validação do texto do chamado | 1–5.000 chars após `trim`; vazio/só-espaços → 400 |
| `resumo` da IA | read-only, ≤300 chars, visível a funcionário/admin, fora da métrica |
| Quem cancela | apenas Admin; a partir de qualquer estado não final |
| Cancelado durante processamento da IA | worker descarta o resultado (reconfirma elegibilidade); permanece `CANCELADO` |
| Estados finais | `RESOLVIDO` e `CANCELADO` não aceitam reclassificação nem transição |
| Autorização do funcionário | só opera chamados atribuídos a ele; senão 403 |
| RF-02 escopo | apenas criar usuário; editar/desativar/excluir fora da v1 |
| Classificação manual pendente na UI | badge "Classificação necessária" na lista do funcionário (RF-08) |
| Gate `→ EM_ATENDIMENTO` | exige classificação final válida |
| Status inicial do chamado | `AGUARDANDO_CLASSIFICACAO` (não `ABERTO`) |
| Chamado sem classificação da IA | funcionário classifica do zero; fica fora do cálculo de concordância |
| Histórico do chamado | log de eventos imutável append-only (RF-11) |
| Visibilidade do histórico | admin vê tudo; funcionário vê original da IA + suas reclassificações; cliente não vê |
| Estado enquanto na fila | `AGUARDANDO_CLASSIFICACAO` |
| Desempate na atribuição | menor id de usuário |
| Sem funcionário para atribuir | não ocorre (premissa: cliente só existe após funcionário) |
| Classificação síncrona × assíncrona | assíncrona (fila + worker) |
| Formato de saída da IA | tool use + validação |
| Transição após classificação manual | `AGUARDANDO_CLASSIFICACAO → ABERTO` automática |
| Notificações | fora da v1 |
| LGPD | básico na v1; formal em versão com dado real |
| Acessibilidade | básico na v1; WCAG AA em versão madura |
| Stack | conforme `stack.md` |

## 13. Fora do escopo deste documento

Design de interface, arquitetura de solução (modelo de dados, endpoints), plano de testes detalhado e cronograma. Este PRD define **o quê** e **por quê**; o **como** vem depois.

## 14. Caminho para produção

Esta v1 é **portfólio/onboarding**: várias decisões foram deliberadamente simplificadas para caber num projeto de estudo, single-instance, sem uso real. Esta seção registra **o que foi simplificado de propósito** e **o que produção exigiria** — para que essas escolhas não sejam lidas como descuido nem copiadas para um contexto real sem revisão.

Duas apostas da v1 pagam no futuro e reduzem o retrabalho:

- **Idempotência por `chamado_id` (RF-06) + histórico append-only (RF-11)** — permitem paralelizar a fila e alimentar treino de modelo **sem redesenhar o núcleo**.
- **`area` já classificada, mas ainda informativa (RF-07)** — roteamento por área vira *feature*, não *migração de dados*.

| Área | Escolha da v1 (portfólio) | Por que basta agora | O que produção exigiria | Invasividade |
|---|---|---|---|---|
| **Fila / throughput** | Worker único, processamento sequencial (RF-06) | Elimina rate limit sob 10 simultâneos; simples de operar | Fila real multi-consumidor (SQS/RabbitMQ/BullMQ) com concorrência limitada por **tokens-por-minuto**, não por "1 de cada vez". A idempotência da v1 já torna múltiplos workers seguros | Média |
| **Atribuição** | Leitura-serial da carga + desempate por menor id (RF-07) | Segura **porque** o worker é único — não há concorrência | Seleção+persistência **atômica** (lock otimista / `SELECT … FOR UPDATE` / serviço de balanceamento). Acoplada à fila: paralelizar a fila **quebra** a premissa que torna a atribuição segura hoje | Alta — é o trabalho de verdade |
| **Instância / disponibilidade** | Single-instance, sem SLA (seções 6–7) | Sem uso 24/7; indisponibilidade não tem custo real | Alvo de disponibilidade derivado do impacto (multi-zona, failover, on-call, orçamento de erro). Ver tabela de noves na metodologia | Alta |
| **Histórico / dados** | Evento `CLASSIFICACAO_IA` grava o **texto de entrada** por evento (RF-11) | Dado fictício, volume baixo; simplifica auditoria e dataset | Particionamento/arquivamento do histórico; **referência** ao chamado em vez de duplicar o texto (minimização de PII); retenção | Média |
| **Privacidade / LGPD** | Básico; sem PII real (seção 7) | Dados de exercício | Base legal, retenção, direito de exclusão, minimização de PII no histórico | Média |
| **Roteamento** | Todo funcionário é Suporte; `area` informativa (RF-07, não-objetivo) | Time único, área não discrimina | Roteamento por área/skill usando a `area` que a v1 **já classifica** — passa de decorativa a funcional | Baixa (dado já existe) |
| **Fine-tuning / modelo** | Registra o dataset (RF-11), não retroalimenta (seção 6) | Human-in-the-loop gera o rótulo; v1 só coleta | Export do dataset, treino/avaliação, promoção de modelo versionado. **Manter humano no loop nos casos incertos** — automação total secaria a fonte de rótulos | Média |

**Ordem provável de ataque em produção:** (1) fila sequencial → concorrente e (2) atribuição serial → atômica são **acoplados** e vêm primeiro; depois (3) single-instance → HA; depois (4) texto duplicado no histórico → referência + LGPD. Roteamento e fine-tuning são incrementos sobre uma base já preparada.

**Gatilho:** tudo aqui é evolução pós-v1, condicionada a "v1 estável e demonstrada na trilha" (seção 11). Nenhum item desta seção está no escopo da v1.

## Anexo A — Matriz de taxonomia `[ABERTO]`

> **Esqueleto — a preencher no design (stakeholder).** Estrutura fixa; célula `[…]` = valor a definir. Regra geral de desempate quando o chamado se encaixa em mais de uma categoria: usar a **intenção principal** do cliente (o que ele quer que aconteça), não o tom nem o sintoma secundário. Preencher `Definição` (regra de decisão, não sinônimo) + `Exemplo` + `Contraexemplo` (caso vizinho que NÃO é este valor) para cada linha — o contraexemplo é o que separa valores adjacentes e dá à IA e ao funcionário o mesmo critério.

### A.1 `categoria`

| Valor | Definição (quando usar) | Exemplo | Contraexemplo (é outro valor) |
|---|---|---|---|
| `PROBLEMA_TECNICO` | `[…]` | `[…]` | `[…]` |
| `DUVIDA` | `[…]` | `[…]` | `[… — fronteira com SOLICITACAO]` |
| `RECLAMACAO` | `[…]` | `[…]` | `[… — fronteira com PROBLEMA_TECNICO]` |
| `SOLICITACAO` | `[…]` | `[…]` | `[… — fronteira com DUVIDA]` |
| `OUTROS` | `[… — só quando nenhuma das acima se aplica]` | `[…]` | `[…]` |

### A.2 `prioridade`

| Valor | Definição (quando usar) | Exemplo | Contraexemplo (é outro valor) |
|---|---|---|---|
| `CRITICA` | `[… — impede operação / impacto amplo e imediato]` | `[…]` | `[… — fronteira com ALTA]` |
| `ALTA` | `[… — impacto significativo, mas há operação parcial / workaround]` | `[…]` | `[… — fronteira com CRITICA e com MEDIA]` |
| `MEDIA` | `[…]` | `[…]` | `[…]` |
| `BAIXA` | `[…]` | `[…]` | `[…]` |

### A.3 `area` *(informativa — não roteia atribuição, ver RF-07)*

| Valor | Definição (quando usar) | Exemplo | Contraexemplo (é outro valor) |
|---|---|---|---|
| `ENGENHARIA` | `[…]` | `[…]` | `[… — fronteira com SUPORTE_TECNICO]` |
| `QUALIDADE` | `[…]` | `[…]` | `[…]` |
| `LOGISTICA` | `[…]` | `[…]` | `[…]` |
| `COMERCIAL` | `[…]` | `[…]` | `[…]` |
| `SUPORTE_TECNICO` | `[…]` | `[…]` | `[… — fronteira com ENGENHARIA]` |
| `OUTROS` | `[…]` | `[…]` | `[…]` |

### A.4 `sentimento`

| Valor | Definição (quando usar) | Exemplo | Contraexemplo (é outro valor) |
|---|---|---|---|
| `POSITIVO` | `[…]` | `[…]` | `[…]` |
| `NEUTRO` | `[…]` | `[…]` | `[…]` |
| `NEGATIVO` | `[… — insatisfação sobre o problema]` | `[…]` | `[… — fronteira com FRUSTRADO]` |
| `FRUSTRADO` | `[… — carga emocional acima de NEGATIVO: reincidência, esgotamento]` | `[…]` | `[… — fronteira com NEGATIVO]` |
