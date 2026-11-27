import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { DocumentosService } from '../documentos/documentos.service.js';
import { AdministradorService } from './administrador.service.js';
import {
  SQL_ACTIVAR_TRABAJADOR, SQL_APROBAR_DOCUMENTO, SQL_DOCUMENTO_BLOQUEAR,
  SQL_DOCUMENTOS_APROBADOS, SQL_NOTIFICAR, SQL_RECHAZAR_DOCUMENTO,
} from './administrador.sql.js';

function crearServicio(estado: string, aprobados = '2') {
  const query = vi.fn(async (sql: string) => {
    if (sql === SQL_DOCUMENTO_BLOQUEAR) return [{ id: 5, trabajadorId: 9, tipo: 'identidad', estado }];
    if (sql === SQL_DOCUMENTOS_APROBADOS) return [{ aprobados }];
    if (sql === SQL_ACTIVAR_TRABAJADOR) return [{ cuenta_id: 9 }];
    return [];
  });
  const manager = { query } as unknown as EntityManager;
  const db = { transaction: vi.fn(async (fn: (m: EntityManager) => Promise<unknown>) => fn(manager)) } as unknown as DataSource;
  return { service: new AdministradorService(db, {} as DocumentosService), query };
}

describe('Verificación documental de administración', () => {
  it('exige un motivo de entre cinco y trescientos caracteres', () => {
    const { service } = crearServicio('pendiente');
    expect(() => service.rechazarDocumento(1, 5, '   ')).toThrow(BadRequestException);
    expect(() => service.rechazarDocumento(1, 5, 'mal')).toThrow(BadRequestException);
  });

  it('persiste la observación y notifica la corrección', async () => {
    const { service, query } = crearServicio('pendiente');
    const res = await service.rechazarDocumento(1, 5, '  Documento ilegible  ');
    expect(res).toEqual({ documentoId: 5, estado: 'rechazado', motivo: 'Documento ilegible' });
    expect(query).toHaveBeenCalledWith(SQL_RECHAZAR_DOCUMENTO, [5, 1, 'Documento ilegible']);
    expect(query).toHaveBeenCalledWith(SQL_NOTIFICAR, [9, null, expect.stringContaining('Documento ilegible')]);
  });

  it('activa el perfil al tener los tres documentos aprobados', async () => {
    const { service, query } = crearServicio('pendiente', '3');
    const res = await service.aprobarDocumento(1, 5);
    expect(res.cuentaActivada).toBe(true);
    expect(query).toHaveBeenCalledWith(SQL_APROBAR_DOCUMENTO, [5, 1]);
    expect(query).toHaveBeenCalledWith(SQL_ACTIVAR_TRABAJADOR, [9]);
  });

  it('no aprueba dos veces un documento', async () => {
    const { service } = crearServicio('rechazado');
    await expect(service.aprobarDocumento(1, 5)).rejects.toBeInstanceOf(ConflictException);
  });
});
