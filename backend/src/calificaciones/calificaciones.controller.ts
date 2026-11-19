import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { CalificacionesService } from './calificaciones.service.js';
import { CalificarDto, ReporteDto } from './dto/calificaciones.dto.js';

@ApiTags('Calificaciones y reportes')
@Controller()
export class CalificacionesController {
  constructor(private readonly calificaciones: CalificacionesService) {}

  /** Cliente o trabajador. Califica un pedido finalizado, una sola vez (RF-18, RF-19). El cliente puede adjuntar un reporte (RF-32). */
  @Post('pedidos/:id/calificar')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  calificar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number, @Body() dto: CalificarDto) {
    return this.calificaciones.calificar(usuario.id, id, dto);
  }

  /** Cliente. Reporta un incumplimiento, estafa o robo de un pedido finalizado o cancelado (RF-32). */
  @Post('pedidos/:id/reportar')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  reportar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number, @Body() dto: ReporteDto) {
    return this.calificaciones.reportar(usuario.id, id, dto);
  }

  /** Las calificaciones del pedido. El cliente no ve la del trabajador (RN-12). */
  @Get('pedidos/:id/calificaciones')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  delPedido(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.calificaciones.delPedido(usuario.id, id);
  }

  /** Mis reportes y en qué estado están. */
  @Get('reportes/mios')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  misReportes(@UsuarioActual() usuario: UsuarioToken) {
    return this.calificaciones.misReportes(usuario.id);
  }

  /** Pública. Pantalla «Perfil del trabajador»: promedio, cantidad y comentarios (RF-07). */
  @Get('trabajadores/:id/opiniones')
  @ApiQuery({ name: 'pagina', required: false, description: 'Empieza en 1; 20 opiniones por página' })
  opiniones(@Param('id', ParseIntPipe) id: number, @Query('pagina') pagina?: string) {
    const numero = Math.max(1, Number.parseInt(pagina ?? '1', 10) || 1);
    return this.calificaciones.opiniones(id, numero);
  }
}
