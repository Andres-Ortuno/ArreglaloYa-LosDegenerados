import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { Trabajador } from './trabajador.entity.js';
import { TrabajadoresController } from './trabajadores.controller.js';
import { TrabajadoresService } from './trabajadores.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Trabajador]), CuentasModule, CatalogosModule],
  controllers: [TrabajadoresController],
  providers: [TrabajadoresService],
})
export class TrabajadoresModule {}
