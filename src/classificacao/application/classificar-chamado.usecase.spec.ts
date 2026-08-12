import { ClassificarChamadoUseCase } from './classificar-chamado.usecase';
import type {
  ClassificacaoStore,
  ClassificadorGateway,
  ResultadoClassificacao,
  TicketParaClassificar,
} from './ports';
import type { RegistrarEventoUseCase } from '../../historico/application/registrar-evento.usecase';
import type { NovoEvento } from '../../historico/domain/evento';

const RESULTADO: ResultadoClassificacao = {
  categoria: 'RECLAMACAO',
  prioridade: 'ALTA',
  area: 'LOGISTICA',
  sentimento: 'FRUSTRADO',
  resumo: 'Pedido atrasado.',
  modelo: 'claude-sonnet-5',
  versao: 'claude-sonnet-5-x',
};

// Mocks como fns standalone (não métodos de objeto) p/ evitar unbound-method no expect.
function montar(ticket: TicketParaClassificar | null) {
  const buscar = jest.fn().mockResolvedValue(ticket);
  const salvarClassificacao = jest.fn().mockResolvedValue(undefined);
  const cargasDosFuncionarios = jest.fn().mockResolvedValue([
    { funcionarioId: 3, ativos: 2 },
    { funcionarioId: 5, ativos: 1 },
  ]);
  const atribuirEAbrir = jest.fn().mockResolvedValue(undefined);
  const classificar = jest.fn().mockResolvedValue(RESULTADO);

  const store = {
    buscar,
    salvarClassificacao,
    cargasDosFuncionarios,
    atribuirEAbrir,
  } as unknown as ClassificacaoStore;
  const gateway = { classificar } as unknown as ClassificadorGateway;

  const eventos: NovoEvento[] = [];
  const registrar = {
    executar: jest.fn((e: NovoEvento) => {
      eventos.push(e);
      return Promise.resolve();
    }),
  } as unknown as RegistrarEventoUseCase;

  const uc = new ClassificarChamadoUseCase(store, gateway, registrar);
  return {
    uc,
    eventos,
    salvarClassificacao,
    cargasDosFuncionarios,
    atribuirEAbrir,
    classificar,
  };
}

const AWAITING: TicketParaClassificar = {
  id: 42,
  status: 'AWAITING_CLASSIFICATION',
  body: 'meu pedido atrasou',
};

describe('ClassificarChamadoUseCase', () => {
  it('classifica → atribui ao de menor carga → abre → grava os 3 eventos', async () => {
    const { uc, salvarClassificacao, atribuirEAbrir, eventos } =
      montar(AWAITING);
    await uc.executar(42);

    expect(salvarClassificacao).toHaveBeenCalledWith(42, RESULTADO);
    expect(atribuirEAbrir).toHaveBeenCalledWith(42, 5); // menor carga

    expect(eventos.map((e) => e.type)).toEqual([
      'CLASSIFICACAO_IA',
      'ATRIBUICAO',
      'MUDANCA_STATUS',
    ]);
    expect(eventos.every((e) => e.authorId === null)).toBe(true);
    expect(eventos[1].payload).toEqual({ assigneeId: 5 });
    expect(eventos[2].payload).toEqual({
      de: 'AWAITING_CLASSIFICATION',
      para: 'OPEN',
    });
  });

  it('atribui ANTES de abrir (salvar → atribuir; sem transição no salvar)', async () => {
    const { uc, salvarClassificacao, atribuirEAbrir } = montar(AWAITING);
    const ordem: string[] = [];
    salvarClassificacao.mockImplementation(() => {
      ordem.push('salvar');
      return Promise.resolve();
    });
    atribuirEAbrir.mockImplementation(() => {
      ordem.push('atribuir');
      return Promise.resolve();
    });
    await uc.executar(42);
    expect(ordem).toEqual(['salvar', 'atribuir']);
  });

  it('sem funcionário: abre sem assignee e não grava ATRIBUICAO', async () => {
    const { uc, cargasDosFuncionarios, atribuirEAbrir, eventos } =
      montar(AWAITING);
    cargasDosFuncionarios.mockResolvedValue([]);
    await uc.executar(42);

    expect(atribuirEAbrir).toHaveBeenCalledWith(42, null);
    expect(eventos.map((e) => e.type)).toEqual([
      'CLASSIFICACAO_IA',
      'MUDANCA_STATUS',
    ]);
  });

  it('descarta se o ticket saiu de AWAITING_CLASSIFICATION', async () => {
    const { uc, classificar, salvarClassificacao, atribuirEAbrir } = montar({
      ...AWAITING,
      status: 'CANCELLED',
    });
    await uc.executar(42);

    expect(classificar).not.toHaveBeenCalled();
    expect(salvarClassificacao).not.toHaveBeenCalled();
    expect(atribuirEAbrir).not.toHaveBeenCalled();
  });

  it('não faz nada se o ticket não existe', async () => {
    const { uc, salvarClassificacao } = montar(null);
    await uc.executar(999);
    expect(salvarClassificacao).not.toHaveBeenCalled();
  });
});
