import { Module } from '@nestjs/common';
import { CalificacionesController } from './calificaciones.controller.js';
import { CalificacionesService } from './calificaciones.service.js';

/** Calificaciones y reportes (CU-09, RF-18, RF-19, RF-32). SQL directo sobre las tablas del script del grupo. */
@Module({
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
})
export class CalificacionesModule {}
