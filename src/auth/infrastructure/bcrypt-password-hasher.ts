import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { PasswordHasher } from '../application/ports';

// Custo 10: padrão do bcrypt, equilíbrio aceito para esta app.
// ponytail: fator fixo. Upgrade para env (BCRYPT_ROUNDS) se hardware/ameaça mudar.
const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  hash(senhaClara: string): Promise<string> {
    return hash(senhaClara, SALT_ROUNDS);
  }

  compare(senhaClara: string, senhaHash: string): Promise<boolean> {
    return compare(senhaClara, senhaHash);
  }
}
