import { ForbiddenException } from '@nestjs/common';
import { SQL_ES_CLIENTE, SQL_TRABAJADOR_ACTIVO } from './solicitudes.sql.js';

/** Sirve tanto con DataSource como con el manager de una transacción. */
export interface Consulta {
  query(sql: string, parametros?: unknown[]): Promise<any>;
}

export async function exigirCliente(db: Consulta, cuentaId: number) {
  const filas: unknown[] = await db.query(SQL_ES_CLIENTE, [cuentaId]);
  if (filas.length === 0) throw new ForbiddenException('Tu cuenta no tiene el rol de cliente');
}

/** Devuelve la zona del trabajador. Falla si no está Activo (CU-04, flujo 6a). */
export async function exigirTrabajadorActivo(db: Consulta, cuentaId: number) {
  const filas: { id: number; zonaId: number }[] = await db.query(SQL_TRABAJADOR_ACTIVO, [cuentaId]);
  if (!filas[0]) {
    throw new ForbiddenException(
      'Necesitas una cuenta de trabajador activa (con documentos verificados y sin suspensión)',
    );
  }
  return filas[0];
}

/** Plazo de una postulación si el trabajador no indica otro (en horas). */
export const PLAZO_POR_DEFECTO_HORAS = 48;
export const PLAZO_MINIMO_HORAS = 1;
export const PLAZO_MAXIMO_HORAS = 168; // 7 días

/** Cuántas veces se puede renovar una postulación. La base lo vuelve a comprobar con un CHECK. */
export const MAX_RENOVACIONES = 2;

export interface PostulacionARenovar {
  trabajadorId: number;
  estado: string;
  vencida: boolean;
  renovaciones: number;
  estadoSolicitud: string;
  solicitudVencida: boolean;
}

/**
 * Condiciones para renovar una postulación. Devuelve el motivo del rechazo, o null si se puede renovar.
 *  1. Es del trabajador que la pide.
 *  2. Está vencida (no se renueva una vigente, elegida ni descartada).
 *  3. La solicitud sigue pendiente y no venció.
 *  4. Lleva menos de MAX_RENOVACIONES renovaciones.
 */
export function motivoNoRenovable(p: PostulacionARenovar, trabajadorId: number): string | null {
  if (p.trabajadorId !== trabajadorId) return 'Esta postulación no es tuya';
  if (p.estado === 'elegida') return 'Esta postulación ya fue elegida';
  if (p.estado === 'descartada') return 'Esta postulación fue descartada y no se puede renovar';
  if (!p.vencida) return 'La postulación todavía está vigente: solo se renueva cuando vence';
  if (p.estadoSolicitud !== 'pendiente' || p.solicitudVencida) {
    return 'La solicitud ya no está disponible, así que no se puede renovar';
  }
  if (p.renovaciones >= MAX_RENOVACIONES) {
    return `Ya renovaste esta postulación ${MAX_RENOVACIONES} veces: no se puede renovar más`;
  }
  return null;
}

/** PostgreSQL devuelve numeric y count como texto: aquí se pasan a número. */
export function num(valor: string | number | null | undefined): number | null {
  return valor === null || valor === undefined ? null : Number(valor);
}
