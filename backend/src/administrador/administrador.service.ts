import { BadRequestException, ConflictException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import { DataSource, type EntityManager } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { DocumentosService } from '../documentos/documentos.service.js';
import {
  SQL_ACTIVAR_TRABAJADOR,
  SQL_APROBAR_DOCUMENTO,
  SQL_BITACORA_DE_PEDIDO,
  SQL_BLOQUEAR_TRABAJADOR,
  SQL_DOCUMENTO_ARCHIVO,
  SQL_DOCUMENTO_BLOQUEAR,
  SQL_DOCUMENTOS_APROBADOS,
  SQL_DOCUMENTOS_DE_TRABAJADOR,
  SQL_ESTAFAS_DISTINTAS,
  SQL_FLUJO_ECONOMICO,
  SQL_INSERT_SANCION,
  SQL_NOTIFICAR,
  SQL_PEDIDO_EXISTE,
  SQL_REACTIVAR_VENCIDOS,
  SQL_RECHAZAR_DOCUMENTO,
  SQL_RECHAZAR_REPORTE,
  SQL_REPORTE_BLOQUEAR,
  SQL_REPORTES_POR_ESTADO,
  SQL_SET_USUARIO,
  SQL_SUSPENDER_CUENTA,
  SQL_SUSPENDER_TRABAJADOR,
  SQL_SUSPENSIONES_PREVIAS,
  SQL_TRABAJADORES_POR_ESTADO,
  SQL_VALIDAR_REPORTE,
} from './administrador.sql.js';
import { aplicaSancionGlobal, horasDeSuspension } from './sanciones.reglas.js';

const TIPOS_DE_ARCHIVO: Record<string, string> = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png' };
const DOCUMENTOS_REQUERIDOS = 3; // identidad, antecedentes y experiencia (RF-03)

@Injectable()
export class AdministradorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly documentos: DocumentosService,
  ) {}

  // ================================================================ CU-10: verificar documentos

  /** Trabajadores por estado, con cuántos documentos tiene cada uno en cada estado. */
  async trabajadores(estado: 'en_revision' | 'activo' | 'suspendido') {
    const filas = await this.dataSource.query(SQL_TRABAJADORES_POR_ESTADO, [estado]);
    return filas.map((f: Record<string, string>) => ({
      ...f,
      subidos: Number(f.subidos),
      aprobados: Number(f.aprobados),
      pendientes: Number(f.pendientes),
      rechazados: Number(f.rechazados),
    }));
  }

  async documentosDe(trabajadorId: number) {
    const filas = await this.dataSource.query(SQL_DOCUMENTOS_DE_TRABAJADOR, [trabajadorId]);
    return filas.map((d: { id: number }) => ({ ...d, archivo: `/api/admin/documentos/${d.id}/archivo` }));
  }

  /** RNF-03: el archivo solo lo abre el administrador. */
  async archivo(documentoId: number) {
    const [doc] = await this.dataSource.query(SQL_DOCUMENTO_ARCHIVO, [documentoId]);
    if (!doc) throw new NotFoundException('El documento no existe');
    const ruta = this.documentos.rutaSegura(doc.archivoUrl);
    if (!ruta) throw new NotFoundException('El archivo no está disponible');
    try {
      return new StreamableFile(createReadStream(ruta), {
        type: TIPOS_DE_ARCHIVO[extname(ruta)] ?? 'application/octet-stream',
        disposition: 'inline',
      });
    } catch {
      throw new NotFoundException('El archivo no está disponible');
    }
  }

  /** RF-04: aprueba un documento. Con los tres aprobados, la cuenta pasa a «Activo». */
  aprobarDocumento(adminId: number, documentoId: number) {
    return this.transaccion(adminId, async (m) => {
      const doc = await this.documentoPendiente(m, documentoId);
      await m.query(SQL_APROBAR_DOCUMENTO, [documentoId, adminId]);
      const [{ aprobados }] = await m.query(SQL_DOCUMENTOS_APROBADOS, [doc.trabajadorId]);
      let activado = false;
      if (Number(aprobados) >= DOCUMENTOS_REQUERIDOS) {
        activado = (await m.query(SQL_ACTIVAR_TRABAJADOR, [doc.trabajadorId]))[0]?.length > 0;
        if (activado) {
          await m.query(SQL_NOTIFICAR, [doc.trabajadorId, null, 'Verificamos tus documentos: tu cuenta de trabajador está activa.']);
        }
      }
      return { documentoId, estado: 'aprobado', cuentaActivada: activado };
    });
  }

  /** RF-04: rechaza un documento con motivo; el trabajador puede volver a subirlo. */
  rechazarDocumento(adminId: number, documentoId: number, motivo: string) {
    return this.transaccion(adminId, async (m) => {
      const doc = await this.documentoPendiente(m, documentoId);
      await m.query(SQL_RECHAZAR_DOCUMENTO, [documentoId, adminId, motivo.trim()]);
      await m.query(SQL_NOTIFICAR, [doc.trabajadorId, null, `Tu documento de ${doc.tipo} fue rechazado: ${motivo.trim()}`.slice(0, 300)]);
      return { documentoId, estado: 'rechazado', motivo: motivo.trim() };
    });
  }

  // ================================================================ CU-11: reportes y sanciones

  reportes(estado: 'pendiente' | 'valido' | 'rechazado') {
    return this.dataSource.query(SQL_REPORTES_POR_ESTADO, [estado]);
  }

  /**
   * El administrador da por válido un reporte y se aplica la sanción:
   *  - incumplimiento o estafa: suspensión escalonada de 1, 2, 3, 5, 8 y 13 h (RN-07, RF-20).
   *    Si es estafa y ya son más de 10 clientes distintos, también se suspende la cuenta completa (RF-35).
   *  - robo: bloqueo permanente; exige el dato de la denuncia policial (RF-21).
   */
  validarReporte(adminId: number, reporteId: number, denunciaPolicial?: string) {
    return this.transaccion(adminId, async (m) => {
      const r = await this.reportePendiente(m, reporteId);
      const denuncia = denunciaPolicial?.trim();
      if (r.tipo === 'robo' && !denuncia) {
        throw new BadRequestException('Un reporte por robo exige los datos de la denuncia policial');
      }
      await m.query(SQL_VALIDAR_REPORTE, [reporteId, adminId]);

      let sancion: Record<string, unknown>;
      let global: Record<string, unknown> | null = null;
      if (r.tipo === 'robo') {
        [sancion] = await m.query(SQL_INSERT_SANCION, [r.trabajadorId, 'bloqueo_permanente', 'Robo comprobado con denuncia policial', reporteId, null, denuncia, adminId]);
        await m.query(SQL_BLOQUEAR_TRABAJADOR, [r.trabajadorId]);
      } else {
        const [{ total: previas }] = await m.query(SQL_SUSPENSIONES_PREVIAS, [r.trabajadorId]);
        const horas = horasDeSuspension(Number(previas));
        [sancion] = await m.query(SQL_INSERT_SANCION, [r.trabajadorId, 'suspension', `Reporte válido de ${r.tipo} (${horas} h)`, reporteId, horas, null, adminId]);
        await m.query(SQL_SUSPENDER_TRABAJADOR, [r.trabajadorId, horas]);

        if (r.tipo === 'estafa') {
          const [{ total: clientes }] = await m.query(SQL_ESTAFAS_DISTINTAS, [r.trabajadorId]);
          if (aplicaSancionGlobal(Number(clientes))) {
            [global] = await m.query(SQL_INSERT_SANCION, [r.trabajadorId, 'suspension_global', `Más de 10 clientes reportaron estafa (${Number(clientes)})`, reporteId, 13, null, adminId]);
            await m.query(SQL_SUSPENDER_CUENTA, [r.trabajadorId, 13]);
          }
        }
      }

      const mensaje = r.tipo === 'robo'
        ? 'Tu cuenta de trabajador fue bloqueada de forma permanente por un reporte de robo.'
        : `Tu cuenta fue suspendida por un reporte válido de ${r.tipo}.`;
      await m.query(SQL_NOTIFICAR, [r.trabajadorId, r.pedidoId, mensaje]);
      await m.query(SQL_NOTIFICAR, [r.clienteId, r.pedidoId, 'Revisamos tu reporte y fue considerado válido. Gracias por avisarnos.']);
      return { reporteId, estado: 'valido', sancion, sancionGlobal: global };
    });
  }

  rechazarReporte(adminId: number, reporteId: number, motivo?: string) {
    return this.transaccion(adminId, async (m) => {
      const r = await this.reportePendiente(m, reporteId);
      await m.query(SQL_RECHAZAR_REPORTE, [reporteId, adminId]);
      await m.query(SQL_NOTIFICAR, [r.clienteId, r.pedidoId, `Revisamos tu reporte y no pudimos validarlo.${motivo ? ` ${motivo.trim()}` : ''}`.slice(0, 300)]);
      return { reporteId, estado: 'rechazado' };
    });
  }

  /** Termina las suspensiones vencidas: el trabajador vuelve a «Activo». Lo llama el temporizador. */
  async reactivarVencidos(): Promise<number> {
    const [filas] = await this.dataSource.query(SQL_REACTIVAR_VENCIDOS);
    return filas.length;
  }

  // ================================================================ historial y economía

  /** RF-34: la bitácora completa de un pedido, en orden. */
  async bitacora(pedidoId: number) {
    if ((await this.dataSource.query(SQL_PEDIDO_EXISTE, [pedidoId])).length === 0) {
      throw new NotFoundException('El pedido no existe');
    }
    return this.dataSource.query(SQL_BITACORA_DE_PEDIDO, [pedidoId]);
  }

  /** RF-23: ingresos, anticipos retenidos, liberados y comisión, por día y con totales. */
  async flujoEconomico(desde?: string, hasta?: string) {
    const filas: Record<string, string>[] = await this.dataSource.query(SQL_FLUJO_ECONOMICO, [desde ?? null, hasta ?? null]);
    const dias = filas.map((f) => ({
      fecha: f.fecha,
      totalPagado: Number(f.totalPagado),
      retenido: Number(f.retenido),
      liberado: Number(f.liberado),
      reembolsado: Number(f.reembolsado),
      comision: Number(f.comision),
    }));
    const suma = (campo: 'totalPagado' | 'retenido' | 'liberado' | 'reembolsado' | 'comision') =>
      Math.round(dias.reduce((s, d) => s + d[campo], 0) * 100) / 100;
    return {
      desde: desde ?? null,
      hasta: hasta ?? null,
      totales: { totalPagado: suma('totalPagado'), retenido: suma('retenido'), liberado: suma('liberado'), reembolsado: suma('reembolsado'), comision: suma('comision') },
      dias,
    };
  }

  // ================================================================ apoyo
  private async documentoPendiente(m: EntityManager, documentoId: number) {
    const [doc] = await m.query(SQL_DOCUMENTO_BLOQUEAR, [documentoId]);
    if (!doc) throw new NotFoundException('El documento no existe');
    if (doc.estado !== 'pendiente') throw new ConflictException(`El documento ya está «${doc.estado}»`);
    return doc as { id: number; trabajadorId: number; tipo: string; estado: string };
  }

  private async reportePendiente(m: EntityManager, reporteId: number) {
    const [r] = await m.query(SQL_REPORTE_BLOQUEAR, [reporteId]);
    if (!r) throw new NotFoundException('El reporte no existe');
    if (r.estado !== 'pendiente') throw new ConflictException(`El reporte ya está «${r.estado}»`);
    return r as { id: number; pedidoId: number; clienteId: number; trabajadorId: number; tipo: 'incumplimiento' | 'estafa' | 'robo'; estado: string };
  }

  private async transaccion<T>(adminId: number, trabajo: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.dataSource.transaction(async (m) => {
        await m.query(SQL_SET_USUARIO, [adminId]);
        return trabajo(m);
      });
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }
}
