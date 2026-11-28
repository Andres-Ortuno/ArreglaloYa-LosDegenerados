import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SQL_ANULAR_VENCIDAS, SQL_VENCER_POSTULACIONES } from './solicitudes.sql.js';

const CADA_HORA = 60 * 60 * 1000;
const CADA_5_MINUTOS = 5 * 60 * 1000; // los plazos de las postulaciones se miden en horas

/**
 * RF-24: anula las solicitudes pendientes que cumplieron 30 días (y avisa al cliente).
 * Corre al arrancar y luego cada hora. No usa paquetes extra.
 *
 * También marca como «vencida» toda postulación cuyo plazo pasó (cada 5 minutos). Aunque el
 * temporizador se atrase, las consultas y el trigger de la base ya tratan como vencida una
 * postulación con el plazo pasado: el temporizador solo ordena el estado y avisa al trabajador.
 */
@Injectable()
export class VencimientoService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(VencimientoService.name);
  private temporizador?: NodeJS.Timeout;
  private temporizadorPostulaciones?: NodeJS.Timeout;

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    void this.anularVencidas();
    this.temporizador = setInterval(() => void this.anularVencidas(), CADA_HORA);
    this.temporizador.unref();

    void this.vencerPostulaciones();
    this.temporizadorPostulaciones = setInterval(() => void this.vencerPostulaciones(), CADA_5_MINUTOS);
    this.temporizadorPostulaciones.unref();
  }

  onModuleDestroy() {
    clearInterval(this.temporizador);
    clearInterval(this.temporizadorPostulaciones);
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

  /** Postulaciones con el plazo vencido pasan a «vencida» y el trabajador recibe un aviso. */
  async vencerPostulaciones() {
    try {
      const vencidas: unknown[] = await this.dataSource.query(SQL_VENCER_POSTULACIONES);
      if (vencidas.length > 0) this.log.log(`${vencidas.length} postulación(es) vencida(s)`);
    } catch (error) {
      this.log.warn(`No se pudo revisar las postulaciones vencidas: ${(error as Error).message}`);
    }
  }
}
