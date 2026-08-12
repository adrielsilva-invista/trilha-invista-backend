import { PrismaClassificacaoStore } from './prisma-classificacao.store';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ResultadoClassificacao } from '../application/ports';

function makeStore() {
  const ticket = { findFirst: jest.fn(), update: jest.fn() };
  const prisma = { ticket } as unknown as PrismaService;
  return { ticket, store: new PrismaClassificacaoStore(prisma) };
}

describe('PrismaClassificacaoStore', () => {
  it('buscar filtra por id e deletedAt null, projeta status/body', async () => {
    const { ticket, store } = makeStore();
    ticket.findFirst.mockResolvedValue({
      id: 7,
      status: 'AWAITING_CLASSIFICATION',
      body: 'x',
    });

    await store.buscar(7);

    expect(ticket.findFirst).toHaveBeenCalledWith({
      where: { id: 7, deletedAt: null },
      select: { id: true, status: true, body: true },
    });
  });

  it('salvarClassificacao move para OPEN e grava original_* + final_*', async () => {
    const { ticket, store } = makeStore();
    const r: ResultadoClassificacao = {
      categoria: 'DUVIDA',
      prioridade: 'ALTA',
      area: 'COMERCIAL',
      sentimento: 'NEUTRO',
      resumo: 'r',
      modelo: 'm',
      versao: 'v',
    };

    await store.salvarClassificacao(7, r);

    expect(ticket.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        status: 'OPEN',
        originalCategory: 'DUVIDA',
        originalPriority: 'ALTA',
        originalArea: 'COMERCIAL',
        originalSentiment: 'NEUTRO',
        finalCategory: 'DUVIDA',
        finalPriority: 'ALTA',
        finalArea: 'COMERCIAL',
        finalSentiment: 'NEUTRO',
        summary: 'r',
        aiModel: 'm',
        aiVersion: 'v',
      },
    });
  });
});
