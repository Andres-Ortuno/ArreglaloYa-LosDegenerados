import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard.js';
import { UsuarioActual } from '../common/usuario-actual.decorator.js';
import type { UsuarioToken } from '../common/usuario-token.js';
import { CambioMontoDto, MotivoDto, PagarDto, ResponderCambioDto } from './dto/pedidos.dto.js';
import { PedidosService } from './pedidos.service.js';

@ApiTags('Pedidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  // Las rutas fijas ("mios") van antes que ":id", si no Nest creería que "mios" es un id.

  /** Mis pedidos, como cliente y como trabajador. */
  @Get('mios')
  mios(@UsuarioActual() usuario: UsuarioToken) {
    return this.pedidos.mios(usuario.id);
  }

  /** Detalle del pedido: monto, tipo, visita, materiales, pagos y cambios de monto (RF-09). */
  @Get(':id')
  detalle(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.detalle(usuario.id, id);
  }

  /** CU-05, cliente. Paga el anticipo: el pedido pasa de «Bajo revisión» a «Aprobado» (RF-11). */
  @Post(':id/pagar-anticipo')
  @HttpCode(200)
  pagarAnticipo(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number, @Body() dto: PagarDto) {
    return this.pedidos.pagarAnticipo(usuario.id, id, dto);
  }

  /** Cliente. Paga el saldo faltante, que queda retenido igual que el anticipo (RF-28). */
  @Post(':id/pagar-saldo')
  @HttpCode(200)
  pagarSaldo(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number, @Body() dto: PagarDto) {
    return this.pedidos.pagarSaldo(usuario.id, id, dto);
  }

  /** Trabajador. Propone otro monto con su razón, antes de empezar (RF-27). */
  @Post(':id/cambio-monto')
  proponerCambioMonto(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambioMontoDto,
  ) {
    return this.pedidos.proponerCambioMonto(usuario.id, id, dto);
  }

  /** Cliente. Acepta o rechaza el nuevo monto (RF-27). Si rechaza, el pedido se cancela. */
  @Post(':id/cambio-monto/:cambioId/responder')
  @HttpCode(200)
  responderCambioMonto(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Param('cambioId', ParseIntPipe) cambioId: number,
    @Body() dto: ResponderCambioDto,
  ) {
    return this.pedidos.responderCambioMonto(usuario.id, id, cambioId, dto);
  }

  /** CU-07, trabajador. Inicia el trabajo: «Aprobado» -> «En proceso» (RF-26). */
  @Post(':id/iniciar')
  @HttpCode(200)
  iniciar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.iniciar(usuario.id, id);
  }

  /** CU-07, trabajador. Finaliza: «En proceso» -> «Finalizado» y se libera el pago (RF-12, RF-30). */
  @Post(':id/finalizar')
  @HttpCode(200)
  finalizar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number) {
    return this.pedidos.finalizar(usuario.id, id);
  }

  /** CU-08, cliente. Cancela el pedido antes de que esté «En proceso» (RF-15, RF-31). */
  @Post(':id/cancelar')
  @HttpCode(200)
  cancelar(@UsuarioActual() usuario: UsuarioToken, @Param('id', ParseIntPipe) id: number, @Body() dto: MotivoDto) {
    return this.pedidos.cancelar(usuario.id, id, dto);
  }

  /** CU-07 flujo 4b, cliente. El trabajador no se presentó: se cancela y se devuelve el anticipo (RN-06). */
  @Post(':id/incumplimiento')
  @HttpCode(200)
  reportarIncumplimiento(
    @UsuarioActual() usuario: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MotivoDto,
  ) {
    return this.pedidos.reportarIncumplimiento(usuario.id, id, dto);
  }
}
