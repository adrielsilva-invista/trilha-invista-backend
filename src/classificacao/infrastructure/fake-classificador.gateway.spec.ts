import { FakeClassificadorGateway } from './fake-classificador.gateway';

describe('FakeClassificadorGateway', () => {
  it('devolve um resultado fixo com todos os campos dentro dos enums', async () => {
    const out = await new FakeClassificadorGateway().classificar();
    expect(out.categoria).toBe('OUTROS');
    expect(out.prioridade).toBe('MEDIA');
    expect(out.area).toBe('SUPORTE_TECNICO');
    expect(out.sentimento).toBe('NEUTRO');
    expect(out.modelo).toBe('fake');
    expect(out.versao).toBe('0');
    expect(typeof out.resumo).toBe('string');
  });
});
