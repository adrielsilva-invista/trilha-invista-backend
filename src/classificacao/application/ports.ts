import type { TicketStatus } from '../../chamado/domain/chamado';
import type { CargaFuncionario } from '../domain/atribuicao';

// Resultado de uma classificação (RF-04). Valores em pt-BR = contrato com a IA
// (tool use) e a métrica de concordância; espelham os enums do schema (TASK-07).
export type Categoria =
  'PROBLEMA_TECNICO' | 'DUVIDA' | 'RECLAMACAO' | 'SOLICITACAO' | 'OUTROS';
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type AreaResponsavel =
  | 'ENGENHARIA'
  | 'QUALIDADE'
  | 'LOGISTICA'
  | 'COMERCIAL'
  | 'SUPORTE_TECNICO'
  | 'OUTROS';
export type Sentimento = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO' | 'FRUSTRADO';

export interface ResultadoClassificacao {
  categoria: Categoria;
  prioridade: Prioridade;
  area: AreaResponsavel;
  sentimento: Sentimento;
  resumo: string;
  modelo: string;
  versao: string;
}

// Gateway de IA (D-08): a implementação real (Claude) só entra na TASK-10.
export interface ClassificadorGateway {
  classificar(texto: string): Promise<ResultadoClassificacao>;
}
export const CLASSIFICADOR_GATEWAY = 'CLASSIFICADOR_GATEWAY';

// Fila de classificação (RF-06). jobId = ticketId garante idempotência de enfileiramento.
export interface FilaClassificacao {
  enfileirar(ticketId: number): Promise<void>;
}
export const FILA_CLASSIFICACAO = 'FILA_CLASSIFICACAO';

// Estado mínimo pro worker reconfirmar elegibilidade e persistir o resultado.
export interface TicketParaClassificar {
  id: number;
  status: TicketStatus;
  body: string;
}
export interface ClassificacaoStore {
  buscar(ticketId: number): Promise<TicketParaClassificar | null>;
  // Grava original+final (NÃO transita: quem abre é atribuirEAbrir, após a atribuição).
  salvarClassificacao(
    ticketId: number,
    resultado: ResultadoClassificacao,
  ): Promise<void>;
  // Carga de cada funcionário (id + tickets ativos), pro domínio escolher (RF-07).
  cargasDosFuncionarios(): Promise<CargaFuncionario[]>;
  // Seta o assignee (se houver) e transita AWAITING_CLASSIFICATION → OPEN.
  atribuirEAbrir(ticketId: number, assigneeId: number | null): Promise<void>;
  // Falha da IA (RF-05): atribui (se houver) + marca needsManualClassification,
  // mas NÃO transita — o ticket fica AWAITING_CLASSIFICATION pra classificação manual.
  marcarFalhaEAtribuir(
    ticketId: number,
    assigneeId: number | null,
  ): Promise<void>;
}
export const CLASSIFICACAO_STORE = 'CLASSIFICACAO_STORE';
