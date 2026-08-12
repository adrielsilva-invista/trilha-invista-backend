import { ClassificarChamadoUseCase } from './classificar-chamado.usecase';
import type {
  ClassificadorGateway,
  ClassificacaoStore,
  ResultadoClassificacao,
  TicketParaClassificar,
} from './ports';
import type { RegistrarEventoUseCase } from '../../historico/application/registrar-evento.usecase';

const RESULTADO: ResultadoClassificacao = {
  categoria: 'OUTROS',
  prioridade: 'MEDIA',
  area: 'SUPORTE_TECNICO',
  sentimento: 'NEUTRO',
  resumo: 'resumo',
  modelo: 'fake',
  versao: '0',
};

function make(ticket: TicketParaClassificar | null) {
  const store = {
    buscar: jest.fn().mockResolvedValue(ticket),
    salvarClassificacao: jest.fn().mockResolvedValue(undefined),
  } satisfies ClassificacaoStore;
  const gateway = {
    classificar: jest.fn().mockResolvedValue(RESULTADO),
  } satisfies ClassificadorGateway;
  const registrar = { executar: jest.fn().mockResolvedValue(undefined) };
  const usecase = new ClassificarChamadoUseCase(
    store,
    gateway,
    registrar as unknown as RegistrarEventoUseCase,
  );
  return { store, gateway, registrar, usecase };
}

const elegivel: TicketParaClassificar = {
  id: 7,
  status: 'AWAITING_CLASSIFICATION',
  body: 'texto',
};

describe('ClassificarChamadoUseCase', () => {
  it('classifica, persiste e registra CLASSIFICACAO_IA (autor sistema)', async () => {
    const { gateway, store, registrar, usecase } = make(elegivel);
    await usecase.executar(7);

    expect(gateway.classificar).toHaveBeenCalledWith('texto');
    expect(store.salvarClassificacao).toHaveBeenCalledWith(7, RESULTADO);
    expect(registrar.executar).toHaveBeenCalledWith({
      ticketId: 7,
      type: 'CLASSIFICACAO_IA',
      payload: RESULTADO,
      authorId: null,
    });
  });

  it('descarta quando o chamado não existe', async () => {
    const { gateway, store, usecase } = make(null);
    await usecase.executar(7);
    expect(gateway.classificar).not.toHaveBeenCalled();
    expect(store.salvarClassificacao).not.toHaveBeenCalled();
  });

  it('descarta quando saiu de AWAITING_CLASSIFICATION (cancelado/já classificado)', async () => {
    const { gateway, store, usecase } = make({
      ...elegivel,
      status: 'CANCELLED',
    });
    await usecase.executar(7);
    expect(gateway.classificar).not.toHaveBeenCalled();
    expect(store.salvarClassificacao).not.toHaveBeenCalled();
  });
});
