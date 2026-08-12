import type { ResultadoClassificacao } from '../application/ports';

// Rede de segurança do backend (RF-04): a IA é guiada pelo schema do tool, mas o
// retorno é reconferido aqui. Fonte de verdade dos valores aceitos — espelha os
// enums de ports.ts / schema (TASK-07). Valor fora do enum = erro (TASK-12 trata).
export const CATEGORIAS = [
  'PROBLEMA_TECNICO',
  'DUVIDA',
  'RECLAMACAO',
  'SOLICITACAO',
  'OUTROS',
] as const;
export const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const AREAS = [
  'ENGENHARIA',
  'QUALIDADE',
  'LOGISTICA',
  'COMERCIAL',
  'SUPORTE_TECNICO',
  'OUTROS',
] as const;
export const SENTIMENTOS = [
  'POSITIVO',
  'NEUTRO',
  'NEGATIVO',
  'FRUSTRADO',
] as const;
export const RESUMO_MAX = 300;

export class ResultadoInvalidoError extends Error {}

function umDe<T extends readonly string[]>(
  valores: T,
  v: unknown,
  campo: string,
): T[number] {
  if (typeof v !== 'string' || !valores.includes(v)) {
    throw new ResultadoInvalidoError(
      `${campo} fora do enum: ${JSON.stringify(v)}`,
    );
  }
  return v;
}

export function validarResultado(
  bruto: unknown,
  meta: { modelo: string; versao: string },
): ResultadoClassificacao {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const resumo = typeof o.resumo === 'string' ? o.resumo.trim() : '';
  if (!resumo || resumo.length > RESUMO_MAX) {
    throw new ResultadoInvalidoError(`resumo inválido (1..${RESUMO_MAX} char)`);
  }
  return {
    categoria: umDe(CATEGORIAS, o.categoria, 'categoria'),
    prioridade: umDe(PRIORIDADES, o.prioridade, 'prioridade'),
    area: umDe(AREAS, o.area, 'area'),
    sentimento: umDe(SENTIMENTOS, o.sentimento, 'sentimento'),
    resumo,
    modelo: meta.modelo,
    versao: meta.versao,
  };
}
