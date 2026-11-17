import { Module } from '@nestjs/common';
import { PostulacionesController } from './postulaciones.controller.js';
import { PostulacionesService } from './postulaciones.service.js';
import { SolicitudesController } from './solicitudes.controller.js';
import { SolicitudesService } from './solicitudes.service.js';
import { VencimientoService } from './vencimiento.service.js';

/** Solicitudes y postulaciones (CU-01, CU-04). Usa SQL directo sobre las tablas del script del grupo. */
@Module({
  controllers: [SolicitudesController, PostulacionesController],
  providers: [SolicitudesService, PostulacionesService, VencimientoService],
})
export class SolicitudesModule {}
