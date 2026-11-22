import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AdministradorService } from './administrador.service.js';

const CADA_MINUTO = 60_000;

/**
 * Cuando una suspensión vence, el trabajador vuelve a «Activo» (RF-20).
 * Corre una vez al arrancar y luego cada minuto. Igual que el de solicitudes vencidas, es un temporizador
 * simple: si algún día hay varios servidores, conviene pasarlo a una tarea programada de verdad.
 */
@Injectable()
export class SuspensionesVencidasService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(SuspensionesVencidasService.name);
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly admin: AdministradorService) {}

  onModuleInit() {
    void this.reactivar();
    this.temporizador = setInterval(() => void this.reactivar(), Number(process.env.SUSPENSIONES_CADA_MS ?? CADA_MINUTO));
  }

  onModuleDestroy() {
    clearInterval(this.temporizador);
  }

  private async reactivar() {
    try {
      const cantidad = await this.admin.reactivarVencidos();
      if (cantidad > 0) this.log.log(`${cantidad} trabajador(es) terminaron su suspensión y están activos otra vez`);
    } catch (error) {
      this.log.error('No se pudieron reactivar las suspensiones vencidas', error as Error);
    }
  }
}
