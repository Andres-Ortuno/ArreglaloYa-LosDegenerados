import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { PostulacionesService } from './postulaciones.service.js';

@ApiTags('Postulaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('postulaciones')
export class PostulacionesController {
  constructor(private readonly postulaciones: PostulacionesService) {}

  /** Trabajador. Mis postulaciones y en qué quedó cada una. */
  @Get('mias')
  mias(@UsuarioActual() usuario: UsuarioToken) {
    return this.postulaciones.mias(usuario.id);
  }
}
