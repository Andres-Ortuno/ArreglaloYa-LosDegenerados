import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto.js';
import { ElegirPostulacionDto } from './dto/elegir-postulacion.dto.js';
import { PostularseDto } from './dto/postularse.dto.js';
import { PostulacionesService } from './postulaciones.service.js';
import { SolicitudesService } from './solicitudes.service.js';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(
    private readonly solicitudes: SolicitudesService,
    private readonly postulaciones: PostulacionesService,
  ) {}

  /** Cliente. Pantalla "Solicitar un trabajo" (RF-05, RF-06). */
  @Post()
  crear(@UsuarioActual() usuario: UsuarioToken, @Body() dto: CrearSolicitudDto) {
    return this.solicitudes.crear(usuario.id, dto);
  }

  // Las rutas fijas ("mias", "disponibles") van antes que ":id", si no Nest creería que son un id.

  /** Cliente. Mis solicitudes, con cuántas postulaciones tiene cada una. */
  @Get('mias')
  mias(@UsuarioActual() usuario: UsuarioToken) {
    return this.solicitudes.misSolicitudes(usuario.id);
  }

  /** Trabajador activo. Solicitudes pendientes de su zona y especialidad, la más antigua primero. */
  @Get('disponibles')
  disponibles(@UsuarioActual() usuario: UsuarioToken) {
    return this.solicitudes.disponibles(usuario.id);
  }

  /** Cliente dueño. Detalle de la solicitud con sus postulaciones. */
  @Get(':id')
  detalle(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.solicitudes.detalle(usuario.id, id);
  }

  /** Cliente dueño. Cancela una solicitud pendiente. */
  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.solicitudes.cancelar(usuario.id, id);
  }

  /** Trabajador activo. Se postula con monto, tipo de trabajo, costo de visita y materiales (RF-08). */
  @Post(':id/postulaciones')
  postularse(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostularseDto,
  ) {
    return this.postulaciones.postularse(usuario.id, id, dto);
  }

  /** Cliente dueño. Elige una postulación y un horario: nace el pedido «Bajo revisión» (RF-25). */
  @Post(':id/elegir')
  @HttpCode(200)
  elegir(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ElegirPostulacionDto,
  ) {
    return this.solicitudes.elegir(usuario.id, id, dto);
  }
}
