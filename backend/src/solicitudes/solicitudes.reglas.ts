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

/** PostgreSQL devuelve numeric y count como texto: aquí se pasan a número. */
export function num(valor: string | number | null | undefined): number | null {
  return valor === null || valor === undefined ? null : Number(valor);
}
