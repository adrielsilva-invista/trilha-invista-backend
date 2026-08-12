import type { EventoHistorico } from './evento';

// Fixture de teste compartilhado: evita duplicar a fábrica em cada spec.
export function evt(over: Partial<EventoHistorico>): EventoHistorico {
  return {
    id: 1,
    ticketId: 7,
    type: 'MUDANCA_STATUS',
    payload: {},
    authorId: null,
    createdAt: new Date(0),
    ...over,
  };
}
