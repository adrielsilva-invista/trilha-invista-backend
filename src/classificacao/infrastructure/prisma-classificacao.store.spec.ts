import { PrismaClassificacaoStore } from './prisma-classificacao.store';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ResultadoClassificacao } from '../application/ports';

function makeStore() {
  const ticket = {
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  };
  const user = { findMany: jest.fn() };
  const prisma = { ticket, user } as unknown as PrismaService;
  return { ticket, user, store: new PrismaClassificacaoStore(prisma) };
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

  it('salvarClassificacao grava original_* + final_* SEM transitar (status fica p/ atribuirEAbrir)', async () => {
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
    // toHaveBeenCalledWith é exato: a ausência de `status` acima já prova que não transita aqui.
  });

  it('cargasDosFuncionarios: FUNCIONARIO ativo + tickets ∉ {RESOLVED,CANCELLED}; 0 quando sem grupo', async () => {
    const { ticket, user, store } = makeStore();
    user.findMany.mockResolvedValue([{ id: 3 }, { id: 5 }]);
    ticket.groupBy.mockResolvedValue([{ assigneeId: 3, _count: { _all: 2 } }]);

    const cargas = await store.cargasDosFuncionarios();

    expect(user.findMany).toHaveBeenCalledWith({
      where: { perfil: 'FUNCIONARIO', deletedAt: null },
      select: { id: true },
    });
    expect(ticket.groupBy).toHaveBeenCalledWith({
      by: ['assigneeId'],
      where: {
        assigneeId: { in: [3, 5] },
        status: { notIn: ['RESOLVED', 'CANCELLED'] },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    expect(cargas).toEqual([
      { funcionarioId: 3, ativos: 2 },
      { funcionarioId: 5, ativos: 0 },
    ]);
  });

  it('cargasDosFuncionarios: sem funcionário devolve [] e nem consulta groupBy', async () => {
    const { ticket, user, store } = makeStore();
    user.findMany.mockResolvedValue([]);
    expect(await store.cargasDosFuncionarios()).toEqual([]);
    expect(ticket.groupBy).not.toHaveBeenCalled();
  });

  it('atribuirEAbrir: com assignee seta id + OPEN', async () => {
    const { ticket, store } = makeStore();
    await store.atribuirEAbrir(7, 5);
    expect(ticket.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'OPEN', assigneeId: 5 },
    });
  });

  it('atribuirEAbrir: sem assignee só transita p/ OPEN', async () => {
    const { ticket, store } = makeStore();
    await store.atribuirEAbrir(7, null);
    expect(ticket.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: 'OPEN' },
    });
  });
});
