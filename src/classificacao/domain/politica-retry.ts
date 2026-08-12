// Domínio puro: sem @nestjs, sem @prisma, sem SDK. Ver standards/clean-architecture.md.
import { ResultadoInvalidoError } from './validar-resultado';

// RF-05: falha transitória vale 1 retry; falha definitiva (auth) não insiste.
// Lê o status por duck-typing (erros do SDK Anthropic expõem `.status`) para não
// importar o SDK aqui e manter o domínio puro.
export function ehTransitorio(erro: unknown): boolean {
  if (erro instanceof ResultadoInvalidoError) return true; // valor fora do enum
  const status = (erro as { status?: number } | null | undefined)?.status;
  if (status === undefined) return true; // timeout / falha de conexão
  return status === 429 || status >= 500; // rate limit / erro do servidor
  // 401/403 e demais 4xx → definitivo (sem retry)
}
