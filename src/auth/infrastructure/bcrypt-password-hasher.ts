import { Injectable } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { PasswordHasher } from '../application/ports';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  compare(senhaClara: string, senhaHash: string): Promise<boolean> {
    return compare(senhaClara, senhaHash);
  }
}
