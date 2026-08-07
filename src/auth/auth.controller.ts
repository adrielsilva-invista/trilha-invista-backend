import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { LoginUseCase } from './application/login.usecase';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  senha!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly login: LoginUseCase) {}

  @Post('login')
  @HttpCode(200)
  entrar(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    return this.login.executar(dto.email, dto.senha);
  }
}
