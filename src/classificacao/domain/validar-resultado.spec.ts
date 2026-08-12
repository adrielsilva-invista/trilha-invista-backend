import { ResultadoInvalidoError, validarResultado } from './validar-resultado';

const META = { modelo: 'claude-sonnet-5', versao: 'claude-sonnet-5-x' };
const ok = {
  categoria: 'DUVIDA',
  prioridade: 'MEDIA',
  area: 'SUPORTE_TECNICO',
  sentimento: 'NEUTRO',
  resumo: 'Cliente com dúvida sobre acesso.',
};

describe('validarResultado', () => {
  it('aceita saída válida e injeta modelo/versao', () => {
    const r = validarResultado(ok, META);
    expect(r).toEqual({ ...ok, ...META });
  });

  it('trima o resumo', () => {
    expect(validarResultado({ ...ok, resumo: '  oi  ' }, META).resumo).toBe(
      'oi',
    );
  });

  it.each(['categoria', 'prioridade', 'area', 'sentimento'])(
    'rejeita %s fora do enum',
    (campo) => {
      expect(() => validarResultado({ ...ok, [campo]: 'HACK' }, META)).toThrow(
        ResultadoInvalidoError,
      );
    },
  );

  it('rejeita resumo vazio', () => {
    expect(() => validarResultado({ ...ok, resumo: '   ' }, META)).toThrow(
      ResultadoInvalidoError,
    );
  });

  it('rejeita resumo acima de 300 char', () => {
    expect(() =>
      validarResultado({ ...ok, resumo: 'a'.repeat(301) }, META),
    ).toThrow(ResultadoInvalidoError);
  });

  it('rejeita entrada não-objeto', () => {
    expect(() => validarResultado(null, META)).toThrow(ResultadoInvalidoError);
  });
});
