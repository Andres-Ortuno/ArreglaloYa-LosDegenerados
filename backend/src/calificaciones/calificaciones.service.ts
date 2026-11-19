import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { SQL_NOTIFICAR, SQL_SET_USUARIO } from '../pedidos/pedidos.sql.js';
import { CalificarDto, ReporteDto } from './dto/calificaciones.dto.js';
import {
  SQL_CALIFICACIONES_DE_PEDIDO,
  SQL_INSERT_CALIFICACION,
  SQL_INSERT_REPORTE,
  SQL_MIS_REPORTES,
  SQL_NOTIFICAR_ADMINS,
  SQL_OPINIONES_DE_TRABAJADOR,
  SQL_PEDIDO,
  SQL_RESUMEN_TRABAJADOR,
  SQL_YA_CALIFICO,
  SQL_YA_REPORTO,
} from './calificaciones.sql.js';

interface PedidoBasico {
  id: number;
  estado: string;
  clienteId: number;
  trabajadorId: number;
}

const POR_PAGINA = 20;

@Injectable()
export class CalificacionesService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * RF-18 / RF-19: cada parte califica una sola vez, cuando el pedido está «Finalizado».
   * El cliente califica al trabajador (con comentario y, si quiere, un reporte: RF-32).
   * El trabajador califica al cliente solo con estrellas, y el cliente nunca lo ve (RN-12).
   */
  calificar(usuarioId: number, pedidoId: number, dto: CalificarDto) {
    return this.transaccion(usuarioId, async (m) => {
      const p = await this.pedido(m, pedidoId);
      const esCliente = this.exigirParte(p, usuarioId);
      if (p.estado !== 'finalizado') {
        throw new ConflictException('Solo se puede calificar un pedido finalizado');
      }
      if (!esCliente && (dto.comentario !== undefined || dto.reporte !== undefined)) {
        throw new BadRequestException('El trabajador califica solo con estrellas');
      }

      const direccion = esCliente ? 'cliente_a_trabajador' : 'trabajador_a_cliente';
      if ((await m.query(SQL_YA_CALIFICO, [pedidoId, direccion])).length > 0) {
        throw new ConflictException('Ya calificaste este pedido');
      }

      const destinatario = esCliente ? p.trabajadorId : p.clienteId;
      const [calificacion] = await m.query(SQL_INSERT_CALIFICACION, [
        pedidoId,
        direccion,
        usuarioId,
        destinatario,
        dto.estrellas,
        dto.comentario?.trim() || null,
      ]);

      let reporte: unknown = null;
      if (esCliente) {
        await m.query(SQL_NOTIFICAR, [p.trabajadorId, pedidoId, `Recibiste una calificación de ${dto.estrellas} estrellas por el pedido #${pedidoId}.`]);
        if (dto.reporte) reporte = await this.crearReporte(m, p, usuarioId, dto.reporte);
      }
      return { calificacion, reporte };
    });
  }

  /**
   * RF-32: el cliente reporta un incumplimiento, una estafa o un robo. Se puede hacer también sin calificar,
   * si el pedido terminó o fue cancelado (por ejemplo, tras un incumplimiento). Un reporte por cliente y pedido.
   * El administrador lo valida después y recién ahí se aplican las sanciones (RF-20, RF-21, RF-35).
   */
  reportar(clienteId: number, pedidoId: number, dto: ReporteDto) {
    return this.transaccion(clienteId, async (m) => {
      const p = await this.pedido(m, pedidoId);
      if (p.clienteId !== clienteId) throw new ForbiddenException('Solo el cliente del pedido puede reportar');
      if (!['finalizado', 'cancelado'].includes(p.estado)) {
        throw new ConflictException('Solo se puede reportar un pedido finalizado o cancelado');
      }
      return this.crearReporte(m, p, clienteId, dto);
    });
  }

  /** Calificaciones de un pedido. RN-12: el cliente no ve la que hizo el trabajador. */
  async delPedido(usuarioId: number, pedidoId: number) {
    const [p] = await this.dataSource.query(SQL_PEDIDO, [pedidoId]);
    if (!p) throw new NotFoundException('El pedido no existe');
    const esCliente = this.exigirParte(p, usuarioId);
    const calificaciones = await this.dataSource.query(SQL_CALIFICACIONES_DE_PEDIDO, [pedidoId, !esCliente]);
    const direccionMia = esCliente ? 'cliente_a_trabajador' : 'trabajador_a_cliente';
    const yaCalifique = (await this.dataSource.query(SQL_YA_CALIFICO, [pedidoId, direccionMia])).length > 0;
    return {
      pedidoId,
      calificaciones,
      puedoCalificar: p.estado === 'finalizado' && !yaCalifique,
    };
  }

  /** Opiniones públicas de un trabajador activo, con promedio (RF-07). */
  async opiniones(trabajadorId: number, pagina: number) {
    const [resumen] = await this.dataSource.query(SQL_RESUMEN_TRABAJADOR, [trabajadorId]);
    if (!resumen) throw new NotFoundException('El trabajador no existe o no está activo');
    const opiniones = await this.dataSource.query(SQL_OPINIONES_DE_TRABAJADOR, [
      trabajadorId,
      POR_PAGINA,
      (pagina - 1) * POR_PAGINA,
    ]);
    return {
      trabajadorId,
      nombre: resumen.nombre,
      calificacionPromedio: Number(resumen.calificacionPromedio),
      cantidadOpiniones: Number(resumen.cantidadOpiniones),
      pagina,
      opiniones,
    };
  }

  misReportes(clienteId: number) {
    return this.dataSource.query(SQL_MIS_REPORTES, [clienteId]);
  }

  // ---------------------------------------------------------------- apoyo
  private async crearReporte(m: EntityManager, p: PedidoBasico, clienteId: number, dto: ReporteDto) {
    if ((await m.query(SQL_YA_REPORTO, [p.id, clienteId])).length > 0) {
      throw new ConflictException('Ya reportaste este pedido');
    }
    const [reporte] = await m.query(SQL_INSERT_REPORTE, [p.id, clienteId, p.trabajadorId, dto.tipo, dto.descripcion.trim()]);
    await m.query(SQL_NOTIFICAR_ADMINS, [p.id, `Nuevo reporte de ${dto.tipo} por revisar (pedido #${p.id}).`]);
    return reporte;
  }

  private async pedido(m: EntityManager, pedidoId: number): Promise<PedidoBasico> {
    const [p] = await m.query(SQL_PEDIDO, [pedidoId]);
    if (!p) throw new NotFoundException('El pedido no existe');
    return p;
  }

  /** Devuelve true si el usuario es el cliente, false si es el trabajador; si no es parte del pedido, 403. */
  private exigirParte(p: PedidoBasico, usuarioId: number): boolean {
    if (p.clienteId === usuarioId) return true;
    if (p.trabajadorId === usuarioId) return false;
    throw new ForbiddenException('Este pedido no es tuyo');
  }

  private async transaccion<T>(usuarioId: number, trabajo: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (m) => {
        await m.query(SQL_SET_USUARIO, [usuarioId]);
        return trabajo(m);
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }
}
