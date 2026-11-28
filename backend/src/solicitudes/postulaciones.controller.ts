import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { RenovarPostulacionDto } from './dto/renovar-postulacion.dto.js';
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

  /**
   * Trabajador activo. Renueva una postulación vencida: vuelve a «enviada» con un plazo nuevo.
   * Máximo 2 renovaciones, y solo mientras la solicitud siga pendiente.
   */
  @Post(':id/renovar')
  @HttpCode(200)
  renovar(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenovarPostulacionDto,
  ) {
    return this.postulaciones.renovar(usuario.id, id, dto);
  }
}
