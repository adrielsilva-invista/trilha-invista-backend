import { SetMetadata } from '@nestjs/common';
import { Perfil } from '../domain/perfil';

export const PERFIS_KEY = 'perfis';

// @Perfis('ADMIN', 'FUNCIONARIO') anota a rota; PerfilGuard lê via Reflector.
// Sem o decorator (metadata undefined) = rota pública (guard nem barra).
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);
