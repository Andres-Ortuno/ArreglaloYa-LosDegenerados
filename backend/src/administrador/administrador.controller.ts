import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../common/admin.guard.js';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { AdministradorService } from './administrador.service.js';
import {
  FiltroFechasDto,
  FiltroReportesDto,
  FiltroTrabajadoresDto,
  RechazarDocumentoDto,
  RechazarReporteDto,
  ValidarReporteDto,
} from './dto/administrador.dto.js';

/** Todo lo de este controlador es solo para administradores. */
@ApiTags('Administrador')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdministradorController {
  constructor(private readonly admin: AdministradorService) {}

  // ---------------------------------------------------------------- CU-10: documentos
  /** Trabajadores por estado (por defecto, los que están en revisión) con el avance de sus documentos. */
  @Get('trabajadores')
  trabajadores(@Query() filtro: FiltroTrabajadoresDto) {
    return this.admin.trabajadores(filtro.estado ?? 'en_revision');
  }

  @Get('trabajadores/:id/documentos')
  documentosDe(@Param('id', ParseIntPipe) id: number) {
    return this.admin.documentosDe(id);
  }

  /** Abre el archivo del documento (RNF-03: solo el administrador). */
  @Get('documentos/:id/archivo')
  archivo(@Param('id', ParseIntPipe) id: number) {
    return this.admin.archivo(id);
  }

  @Post('documentos/:id/aprobar')
  @HttpCode(200)
  aprobarDocumento(@UsuarioActual() admin: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.admin.aprobarDocumento(admin.id, id);
  }

  @Post('documentos/:id/rechazar')
  @HttpCode(200)
  rechazarDocumento(
    @UsuarioActual() admin: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarDocumentoDto,
  ) {
    return this.admin.rechazarDocumento(admin.id, id, dto.motivo);
  }

  // ---------------------------------------------------------------- CU-11: reportes y sanciones
  @Get('reportes')
  reportes(@Query() filtro: FiltroReportesDto) {
    return this.admin.reportes(filtro.estado ?? 'pendiente');
  }

  /** Da por válido el reporte y aplica la sanción (suspensión escalonada, global o bloqueo por robo). */
  @Post('reportes/:id/validar')
  @HttpCode(200)
  validarReporte(
    @UsuarioActual() admin: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidarReporteDto,
  ) {
    return this.admin.validarReporte(admin.id, id, dto.denunciaPolicial);
  }

  @Post('reportes/:id/rechazar')
  @HttpCode(200)
  rechazarReporte(
    @UsuarioActual() admin: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RechazarReporteDto,
  ) {
    return this.admin.rechazarReporte(admin.id, id, dto.motivo);
  }

  // ---------------------------------------------------------------- historial y economía
  /** RF-34: bitácora completa del pedido. */
  @Get('pedidos/:id/bitacora')
  bitacora(@Param('id', ParseIntPipe) id: number) {
    return this.admin.bitacora(id);
  }

  /** RF-23: ingresos, retenido, liberado, reembolsado y comisión por rango de fechas. */
  @Get('flujo-economico')
  flujoEconomico(@Query() filtro: FiltroFechasDto) {
    return this.admin.flujoEconomico(filtro.desde, filtro.hasta);
  }
}
