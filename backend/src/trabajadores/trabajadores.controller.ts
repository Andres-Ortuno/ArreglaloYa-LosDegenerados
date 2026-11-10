import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { BuscarTrabajadoresDto } from './dto/buscar-trabajadores.dto.js';
import { PerfilTrabajadorDto } from './dto/perfil-trabajador.dto.js';
import { TrabajadoresService } from './trabajadores.service.js';

@ApiTags('Trabajadores')
@Controller('trabajadores')
export class TrabajadoresController {
  constructor(private readonly trabajadores: TrabajadoresService) {}

  /** Pública. Pantalla "Buscar trabajadores": GET /api/trabajadores?zonaId=1&especialidadId=2 */
  @Get()
  buscar(@Query() filtros: BuscarTrabajadoresDto) {
    return this.trabajadores.buscar(filtros);
  }

  // Las rutas "me" van antes que ":id", si no Nest creería que "me" es un id.
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  miPerfil(@UsuarioActual() usuario: UsuarioToken) {
    return this.trabajadores.miPerfil(usuario.id);
  }

  /** Pantalla "Editar perfil": crea o actualiza el perfil del trabajador. */
  @Put('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  guardarMiPerfil(@UsuarioActual() usuario: UsuarioToken, @Body() dto: PerfilTrabajadorDto) {
    return this.trabajadores.guardarMiPerfil(usuario.id, dto);
  }

  /** Pública. Pantalla "Perfil del trabajador". */
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.trabajadores.obtenerPublico(id);
  }
}
