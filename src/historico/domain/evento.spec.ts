import { eventosVisiveisParaFuncionario } from './evento';
import { evt } from './evento.fixture';

describe('eventosVisiveisParaFuncionario', () => {
  it('mostra classificação da IA e reclassificações do próprio funcionário; esconde o resto', () => {
    const eventos = [
      evt({ id: 1, type: 'CLASSIFICACAO_IA', authorId: null }),
      evt({ id: 2, type: 'RECLASSIFICACAO', authorId: 42 }),
      evt({ id: 3, type: 'RECLASSIFICACAO', authorId: 99 }), // outro funcionário
      evt({ id: 4, type: 'MUDANCA_STATUS', authorId: 42 }),
      evt({ id: 5, type: 'ATRIBUICAO', authorId: null }),
      evt({ id: 6, type: 'FALHA_CLASSIFICACAO', authorId: null }),
    ];

    const visiveis = eventosVisiveisParaFuncionario(eventos, 42);

    expect(visiveis.map((e) => e.id)).toEqual([1, 2]);
  });

  it('funcionário sem eventos visíveis recebe lista vazia', () => {
    const eventos = [evt({ id: 4, type: 'MUDANCA_STATUS', authorId: 42 })];
    expect(eventosVisiveisParaFuncionario(eventos, 42)).toEqual([]);
  });
});
