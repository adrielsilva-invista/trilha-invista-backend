import {
  AREAS,
  CATEGORIAS,
  PRIORIDADES,
  RESUMO_MAX,
  SENTIMENTOS,
} from '../src/classificacao/domain/validar-resultado';
import { ClaudeClassificadorGateway } from '../src/classificacao/infrastructure/claude-classificador.gateway';

// Opt-in: só bate na Anthropic real se ANTHROPIC_API_KEY estiver no ambiente.
// Sem a key (CI, dev sem chave) o bloco inteiro é pulado — não gasta token nem falha.
const rodar = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;

rodar('ClaudeClassificadorGateway (e2e real)', () => {
  it('classifica um chamado real dentro dos enums', async () => {
    const out = await new ClaudeClassificadorGateway().classificar(
      'Meu pedido chegou com a peça quebrada e ninguém responde meus e-mails.',
    );
    expect(CATEGORIAS).toContain(out.categoria);
    expect(PRIORIDADES).toContain(out.prioridade);
    expect(AREAS).toContain(out.area);
    expect(SENTIMENTOS).toContain(out.sentimento);
    expect(out.resumo.length).toBeGreaterThan(0);
    expect(out.resumo.length).toBeLessThanOrEqual(RESUMO_MAX);
  });
});
