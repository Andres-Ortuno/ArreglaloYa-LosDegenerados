import { Module } from '@nestjs/common';
import { DocumentosModule } from '../documentos/documentos.module.js';
import { AdministradorController } from './administrador.controller.js';
import { AdministradorService } from './administrador.service.js';
import { SuspensionesVencidasService } from './suspensiones-vencidas.service.js';

/** Panel del administrador: verificar documentos (CU-10), reportes y sanciones (CU-11), historial y economía. */
@Module({
  imports: [DocumentosModule],
  controllers: [AdministradorController],
  providers: [AdministradorService, SuspensionesVencidasService],
})
export class AdministradorModule {}
