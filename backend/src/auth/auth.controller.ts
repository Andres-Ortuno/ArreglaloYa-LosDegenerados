import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** RF-01: crea una cuenta y devuelve el token de acceso. */
  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  /** RF-33: inicia sesión con correo y contraseña. */
  @Post('login')
  @HttpCode(200)
  iniciarSesion(@Body() dto: LoginDto) {
    return this.auth.iniciarSesion(dto);
  }

  /** Datos de la cuenta con la sesión iniciada. */
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  miCuenta(@UsuarioActual() usuario: UsuarioToken) {
    return this.auth.miCuenta(usuario.id);
  }
}
