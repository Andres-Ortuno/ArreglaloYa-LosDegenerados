import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { cuentaPublica, CuentasService } from './cuentas.service.js';
import { ActivarRolDto } from './dto/activar-rol.dto.js';

@ApiTags('Cuentas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  /** Agrega el rol de cliente o de trabajador a mi cuenta (RN-01). */
  @Post('me/roles')
  async activarRol(@UsuarioActual() usuario: UsuarioToken, @Body() dto: ActivarRolDto) {
    return cuentaPublica(await this.cuentas.activarRol(usuario.id, dto.rol));
  }
}
