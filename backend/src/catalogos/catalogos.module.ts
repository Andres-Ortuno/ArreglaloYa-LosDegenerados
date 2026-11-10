import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosController } from './catalogos.controller.js';
import { CatalogosService } from './catalogos.service.js';
import { Especialidad } from './especialidad.entity.js';
import { Zona } from './zona.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Zona, Especialidad])],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
