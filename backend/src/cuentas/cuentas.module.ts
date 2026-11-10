import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cuenta } from './cuenta.entity.js';
import { CuentasController } from './cuentas.controller.js';
import { CuentasService } from './cuentas.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Cuenta])],
  controllers: [CuentasController],
  providers: [CuentasService],
  exports: [CuentasService],
})
export class CuentasModule {}
