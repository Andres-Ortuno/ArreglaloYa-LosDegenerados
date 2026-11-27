import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentosService, type ArchivoSubido } from './documentos.service.js';
import { SQL_DOCUMENTO_ACTUAL, SQL_MIS_DOCUMENTOS, SQL_TRABAJADOR_EXISTE } from './documentos.sql.js';

const pdf: ArchivoSubido = {
  originalname: 'ejemplo.pdf', mimetype: 'application/pdf', size: 16,
  buffer: Buffer.from('%PDF-demo-ejemplo'),
};

function servicio(query: ReturnType<typeof vi.fn>) {
  const dataSource = { query } as unknown as DataSource;
  const config = { get: vi.fn().mockReturnValue('/tmp/arreglaloya-documentos') } as unknown as ConfigService;
  return new DocumentosService(dataSource, config);
}

describe('DocumentosService', () => {
  it('no reemplaza documentos pendientes de revisión', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ estado: 'en_revision' }])
      .mockResolvedValueOnce([{ id: 7, estado: 'pendiente' }]);
    await expect(servicio(query).subir(3, 'identidad', pdf)).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenNthCalledWith(1, SQL_TRABAJADOR_EXISTE, [3]);
    expect(query).toHaveBeenNthCalledWith(2, SQL_DOCUMENTO_ACTUAL, [3, 'identidad']);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('no reemplaza documentos aprobados', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ estado: 'activo' }])
      .mockResolvedValueOnce([{ id: 7, estado: 'aprobado' }]);
    await expect(servicio(query).subir(3, 'identidad', pdf)).rejects.toBeInstanceOf(ConflictException);
  });

  it('consulta estados persistidos y calcula los tipos faltantes', async () => {
    const query = vi.fn().mockResolvedValue([
      { id: 7, tipo: 'identidad', estado: 'aprobado', motivoRechazo: null },
      { id: 8, tipo: 'antecedentes', estado: 'rechazado', motivoRechazo: 'Documento borroso' },
    ]);
    const resultado = await servicio(query).mios(3);
    expect(query).toHaveBeenCalledWith(SQL_MIS_DOCUMENTOS, [3]);
    expect(resultado.faltan).toEqual(['experiencia']);
    expect(resultado.documentos[1].motivoRechazo).toBe('Documento borroso');
  });

  it('no deja acceder fuera de la carpeta de subida', () => {
    const documentos = servicio(vi.fn());
    expect(documentos.rutaSegura('../privado.pdf')).toBeNull();
    expect(documentos.rutaSegura('documentos/3/identidad.pdf'))
      .toBe('/tmp/arreglaloya-documentos/documentos/3/identidad.pdf');
  });
});
