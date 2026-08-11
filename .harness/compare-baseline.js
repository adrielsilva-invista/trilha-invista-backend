#!/usr/bin/env node
// compare-baseline.js
// Compara métricas atuais vs baseline. Sem dependências externas.
//
// Uso: node compare-baseline.js <baseline.json> <metrics.json>
// Exit 0 se passou. Exit 1 se quebrou catraca.

const fs = require('fs');

const [, , baselinePath, metricsPath] = process.argv;
if (!baselinePath || !metricsPath) {
  console.error('Uso: compare-baseline.js <baseline.json> <metrics.json>');
  process.exit(1);
}

const read = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { console.error(`Erro lendo ${p}: ${e.message}`); process.exit(1); }
};

const baseline = read(baselinePath);
const metrics  = read(metricsPath);

// Permite que metrics venha "achatado" ou aninhado (do orquestrador).
function pick(obj, key) {
  if (obj == null) return null;
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === 'object' && key in obj[k]) return obj[k][key];
  }
  return null;
}

const checks = [
  { key: 'test_failures',        direction: 'eq',    absolute: true,  label: 'Testes vermelhos' },
  { key: 'coverage_pct',         direction: 'gte',   absolute: false, label: 'Cobertura (%)' },
  { key: 'duplication_pct',      direction: 'lte',   absolute: false, label: 'Duplicação (%)' },
  { key: 'lint_violations',      direction: 'lte',   absolute: false, label: 'Lint violations' },
  { key: 'largest_file_lines',   direction: 'lte',   absolute: false, label: 'Maior arquivo (linhas)' },
  { key: 'compliance_violations',direction: 'eq',    absolute: true,  label: 'Compliance violations' },
];

const result = { pass: true, items: [] };
const RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RESET = '\x1b[0m';

for (const c of checks) {
  const base = pick(baseline, c.key);
  const cur  = pick(metrics,  c.key);
  let status = 'pass';
  let detail = '';

  if (cur == null) {
    status = 'skip';
    detail = 'sem dado atual';
  } else if (c.absolute) {
    if (cur !== 0) { status = 'fail'; detail = `gate absoluto: precisa ser 0, está ${cur}`; }
    else           { detail = `OK (=0)`; }
  } else if (base == null) {
    status = 'skip';
    detail = 'baseline não definido — rode --generate-baseline';
  } else if (c.direction === 'gte') {
    if (cur < base) { status = 'fail'; detail = `${cur} < baseline ${base}`; }
    else            { detail = `${cur} >= baseline ${base}`; }
  } else if (c.direction === 'lte') {
    if (cur > base) { status = 'fail'; detail = `${cur} > baseline ${base}`; }
    else            { detail = `${cur} <= baseline ${base}`; }
  } else if (c.direction === 'eq') {
    if (cur !== base) { status = 'fail'; detail = `${cur} != baseline ${base}`; }
    else              { detail = `${cur} == baseline ${base}`; }
  }

  const color = status === 'fail' ? RED : status === 'skip' ? YELLOW : GREEN;
  const icon  = status === 'fail' ? '✗' : status === 'skip' ? '~' : '✓';
  console.log(`${color}${icon} ${c.label.padEnd(28)}${RESET} ${detail}`);

  if (status === 'fail') result.pass = false;
  result.items.push({ key: c.key, base, cur, status, detail });
}

console.log();
console.log(JSON.stringify(result, null, 2));

process.exit(result.pass ? 0 : 1);
