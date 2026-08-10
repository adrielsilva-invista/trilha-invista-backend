// Gera um snapshot Kanban (HTML self-contained) a partir de plan-build/Progress.md.
// Fonte única de verdade = Progress.md; o card é POSICIONADO por dado (status ✅/🟡/🔴/⛔),
// não arrastado à mão. Atualize o Progress.md, rode `npm run kanban`, o board regenera.
//
// Uso:
//   node scripts/kanban.mjs              # gera kanban.html
//   node scripts/kanban.mjs --selftest   # roda asserts do parser (não escreve arquivo)
//
// ponytail: sem drag-and-drop interativo nem edição pelo HTML (não persistiria e
//   contradiz o "auto por dado"). Upgrade: servir + escrever de volta no Progress.md.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROGRESS = join(ROOT, 'plan-build', 'Progress.md');
const OUT = join(ROOT, 'kanban.html');

// Status emoji → coluna. Ordem = ordem das colunas no board.
const COLUNAS = [
  { key: 'pendente', emoji: '🔴', titulo: 'A Fazer' },
  { key: 'andamento', emoji: '🟡', titulo: 'Em Andamento' },
  { key: 'bloqueada', emoji: '⛔', titulo: 'Bloqueada' },
  { key: 'concluida', emoji: '✅', titulo: 'Concluída' },
];
const EMOJI_COL = new Map(COLUNAS.map((c) => [c.emoji, c.key]));

// Extrai % da barra [██████░░░░] contando blocos cheios sobre o total.
function progressoDaBarra(barra) {
  const cheios = (barra.match(/█/g) ?? []).length;
  const vazios = (barra.match(/░/g) ?? []).length;
  const total = cheios + vazios;
  return total === 0 ? 0 : Math.round((cheios / total) * 100);
}

// Um card por linha `TASK-01 | [barra] | descrição | ✅ CONCLUÍDA (nota)`.
function parseLinhaTask(linha, sprint) {
  const cols = linha.split('|').map((s) => s.trim());
  if (cols.length < 4 || !/^TASK-\d+/i.test(cols[0])) return null;
  const [id, barra, descricao, statusRaw] = cols;
  const emoji = [...EMOJI_COL.keys()].find((e) => statusRaw.includes(e));
  if (!emoji) return null;
  const nota = (statusRaw.match(/\(([^)]+)\)/) ?? [])[1] ?? '';
  return {
    id: id.toUpperCase(),
    sprint,
    descricao,
    progresso: progressoDaBarra(barra),
    coluna: EMOJI_COL.get(emoji),
    statusLabel: statusRaw.replace(/[🔴🟡⛔✅]/g, '').trim(),
    nota,
  };
}

// Datas de conclusão: header do log `### Sessão 2026-08-10 — ... TASK-05 ...`.
// Mapa TASK-id → data mais recente em que apareceu num header de sessão.
function parseDatasDeSessao(md) {
  const datas = new Map();
  const re = /^###\s+Sess[aã]o\s+(\d{4}-\d{2}-\d{2})\s+—\s+(.+)$/gim;
  let m;
  while ((m = re.exec(md)) !== null) {
    const data = m[1];
    for (const t of m[2].matchAll(/TASK-\d+/gi)) {
      datas.set(t[0].toUpperCase(), data); // re avança em ordem → fica a última
    }
  }
  return datas;
}

// Blocos ``` sob qualquer header `## Status Visual...`. Primeira linha do fence
// é o nome da sprint (`Sprint-1 — Fundação (sem IA)`).
function parseBoards(md) {
  const cards = [];
  const secao = /^##\s+Status Visual[^\n]*\n+```[^\n]*\n([\s\S]*?)```/gim;
  let s;
  while ((s = secao.exec(md)) !== null) {
    const linhas = s[1].split('\n');
    const sprint = (linhas[0] ?? '').trim();
    for (const linha of linhas.slice(1)) {
      const card = parseLinhaTask(linha, sprint);
      if (card) cards.push(card);
    }
  }
  return cards;
}

function parseProgress(raw) {
  const md = raw.replace(/\r\n/g, '\n'); // tolera CRLF (Windows)
  const cards = parseBoards(md);
  const datas = parseDatasDeSessao(md);
  for (const c of cards) {
    if (c.coluna === 'concluida') c.dataConclusao = datas.get(c.id) ?? null;
  }
  return cards;
}

function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );
}

function render(cards, geradoEm) {
  const porColuna = (key) => cards.filter((c) => c.coluna === key);
  const cardHtml = (c) => `
      <article class="card card--${c.coluna}">
        <header><span class="id">${esc(c.id)}</span><span class="sprint">${esc(c.sprint.split('—')[0].trim())}</span></header>
        <p class="desc">${esc(c.descricao)}</p>
        <div class="bar" title="${c.progresso}%"><span style="width:${c.progresso}%"></span></div>
        <footer>
          <span class="status">${esc(c.statusLabel)}</span>
          ${c.dataConclusao ? `<span class="date">✓ ${esc(c.dataConclusao)}</span>` : ''}
        </footer>
        ${c.nota ? `<p class="nota">${esc(c.nota)}</p>` : ''}
      </article>`;

  const colHtml = COLUNAS.map((col) => {
    const items = porColuna(col.key);
    return `
    <section class="col">
      <h2>${col.emoji} ${esc(col.titulo)} <span class="count">${items.length}</span></h2>
      ${items.map(cardHtml).join('') || '<p class="vazio">—</p>'}
    </section>`;
  }).join('');

  return `<!doctype html>
<html lang="pt-BR" data-theme-aware>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kanban — Classificador de Chamados</title>
<style>
  :root {
    --bg:#f4f5f7; --panel:#ebecf0; --card:#fff; --text:#172b4d; --muted:#5e6c84;
    --bar-bg:#dfe1e6; --bar:#0052cc; --done:#36b37e; --line:#dfe1e6;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0d1117; --panel:#161b22; --card:#1c2128; --text:#e6edf3;
      --muted:#8b949e; --bar-bg:#30363d; --bar:#388bfd; --done:#3fb950; --line:#30363d; }
  }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;
    background:var(--bg); color:var(--text); padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .meta { color:var(--muted); font-size:13px; margin:0 0 20px; }
  .board { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; align-items:start; }
  @media (max-width:900px){ .board{ grid-template-columns:1fr; } }
  .col { background:var(--panel); border-radius:10px; padding:12px; }
  .col h2 { font-size:13px; text-transform:uppercase; letter-spacing:.04em;
    color:var(--muted); margin:0 0 12px; display:flex; align-items:center; gap:6px; }
  .count { margin-left:auto; background:var(--bar-bg); color:var(--text);
    border-radius:20px; padding:1px 9px; font-size:12px; }
  .card { background:var(--card); border-radius:8px; padding:12px; margin-bottom:10px;
    box-shadow:0 1px 2px rgba(0,0,0,.15); border-left:3px solid var(--bar); }
  .card--concluida { border-left-color:var(--done); }
  .card--bloqueada { border-left-color:#de350b; }
  .card header { display:flex; justify-content:space-between; align-items:center;
    font-size:12px; color:var(--muted); margin-bottom:6px; }
  .card .id { font-weight:700; color:var(--text); }
  .card .desc { margin:0 0 10px; font-size:13px; }
  .bar { height:6px; background:var(--bar-bg); border-radius:4px; overflow:hidden; }
  .bar span { display:block; height:100%; background:var(--bar); }
  .card--concluida .bar span { background:var(--done); }
  .card footer { display:flex; justify-content:space-between; align-items:center;
    margin-top:8px; font-size:12px; color:var(--muted); }
  .date { color:var(--done); font-weight:600; }
  .nota { margin:6px 0 0; font-size:12px; color:var(--muted); font-style:italic; }
  .vazio { color:var(--muted); text-align:center; padding:16px 0; margin:0; }
</style>
</head>
<body>
  <h1>Kanban — Classificador Inteligente de Chamados</h1>
  <p class="meta">Snapshot de <code>plan-build/Progress.md</code> · gerado ${esc(geradoEm)} · ${cards.length} tasks</p>
  <div class="board">${colHtml}</div>
</body>
</html>`;
}

function selftest() {
  const amostra = `
## Status Visual da Sprint Ativa

\`\`\`
Sprint-1 — Fundação (sem IA)
TASK-01 | [██████████] | Modelo de dados        | ✅ CONCLUÍDA (migrate init aplicada)
TASK-05 | [█████░░░░░] | Máquina de estados     | 🟡 EM ANDAMENTO
TASK-06 | [░░░░░░░░░░] | Cliente acompanha      | 🔴 PENDENTE
\`\`\`

### Sessão 2026-08-07 — TASK-01 (Prisma)
### Sessão 2026-08-10 — TASK-05 (máquina de estados)
`;
  const cards = parseProgress(amostra);
  const assert = (c, msg) => {
    if (!c) throw new Error('FALHOU: ' + msg);
  };
  assert(cards.length === 3, `esperava 3 cards, veio ${cards.length}`);
  const t1 = cards.find((c) => c.id === 'TASK-01');
  assert(t1.coluna === 'concluida', 'TASK-01 devia estar concluída');
  assert(t1.progresso === 100, `TASK-01 progresso ${t1.progresso} != 100`);
  assert(t1.nota === 'migrate init aplicada', `nota errada: ${t1.nota}`);
  assert(t1.dataConclusao === '2026-08-07', `data errada: ${t1.dataConclusao}`);
  const t5 = cards.find((c) => c.id === 'TASK-05');
  assert(t5.coluna === 'andamento', 'TASK-05 devia estar em andamento');
  assert(t5.progresso === 50, `TASK-05 progresso ${t5.progresso} != 50`);
  const t6 = cards.find((c) => c.id === 'TASK-06');
  assert(t6.coluna === 'pendente', 'TASK-06 devia estar pendente');
  assert(t6.progresso === 0, 'TASK-06 progresso != 0');
  // Sanidade: render não quebra e produz HTML.
  assert(render(cards, 'x').startsWith('<!doctype html>'), 'render inválido');
  console.log('selftest OK — 3 cards, colunas/progresso/nota/data corretos');
}

if (process.argv.includes('--selftest')) {
  selftest();
} else {
  const md = readFileSync(PROGRESS, 'utf8');
  const cards = parseProgress(md);
  // ponytail: data de geração via new Date() (não determinístico) — ok pra um
  //   artefato de snapshot; o selftest passa data fixa pra continuar determinístico.
  const geradoEm = new Date().toISOString().slice(0, 16).replace('T', ' ');
  writeFileSync(OUT, render(cards, geradoEm));
  console.log(`kanban.html gerado — ${cards.length} tasks lidas de Progress.md`);
}
