import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SQL_ANULAR_VENCIDAS } from './solicitudes.sql.js';

const CADA_HORA = 60 * 60 * 1000;

/**
 * RF-24: anula las solicitudes pendientes que cumplieron 30 días (y avisa al cliente).
 * Corre al arrancar y luego cada hora. No usa paquetes extra.
 */
@Injectable()
export class VencimientoService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(VencimientoService.name);
  private temporizador?: NodeJS.Timeout;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    void this.anularVencidas();
    this.temporizador = setInterval(() => void this.anularVencidas(), CADA_HORA);
    this.temporizador.unref();
  }

  onModuleDestroy() {
    clearInterval(this.temporizador);
  }

  async anularVencidas() {
    try {
      const anuladas: unknown[] = await this.dataSource.query(SQL_ANULAR_VENCIDAS);
      if (anuladas.length > 0) this.log.log(`${anuladas.length} solicitud(es) vencida(s) anulada(s)`);
    } catch (error) {
      // Por ejemplo, si todavía no se ejecutó el script SQL. No debe tumbar el servidor.
      this.log.warn(`No se pudo revisar las solicitudes vencidas: ${(error as Error).message}`);
    }
  }
}
