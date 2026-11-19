import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller.js';
import { PedidosService } from './pedidos.service.js';

/** Ciclo de vida del pedido (CU-05, CU-07, CU-08). Usa SQL directo sobre las tablas del script del grupo. */
@Module({
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
