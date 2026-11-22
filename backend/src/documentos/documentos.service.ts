import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { traducirErrorBd } from '../common/errores-bd.js';
import { TIPOS_DOCUMENTO, type TipoDocumento } from './dto/subir-documento.dto.js';
import {
  SQL_DOCUMENTO_ACTUAL,
  SQL_GUARDAR_DOCUMENTO,
  SQL_MIS_DOCUMENTOS,
  SQL_NOTIFICAR_ADMINS,
  SQL_TRABAJADOR_EXISTE,
} from './documentos.sql.js';

/** Lo que entrega multer (FileInterceptor) con el archivo en memoria. */
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Se revisa el contenido real del archivo (primeros bytes), no solo la extensión que dice el nombre. */
function detectarExtension(buffer: Buffer): '.pdf' | '.jpg' | '.png' | null {
  if (buffer.subarray(0, 4).toString('latin1') === '%PDF') return '.pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return '.png';
  return null;
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /** Carpeta donde se guardan los documentos. Está fuera de lo que se sirve al público y se ignora en Git. */
  carpetaBase(): string {
    return resolve(this.config.get<string>('UPLOADS_DIR', 'uploads'));
  }

  /**
   * RF-03: el trabajador sube uno de sus tres documentos (PDF, JPG o PNG, hasta 5 MB).
   * Al subirlo queda «pendiente» y el administrador lo revisa (RF-04). Solo el administrador puede verlo (RNF-03).
   */
  async subir(trabajadorId: number, tipo: TipoDocumento, archivo: ArchivoSubido | undefined) {
    if (!archivo?.buffer?.length) throw new BadRequestException('Falta el archivo (campo «archivo»)');
    if (archivo.size > MAX_BYTES) throw new BadRequestException('El archivo supera los 5 MB');
    const extension = detectarExtension(archivo.buffer);
    if (!extension) throw new BadRequestException('Solo se aceptan archivos PDF, JPG o PNG');

    try {
      const [trabajador] = await this.dataSource.query(SQL_TRABAJADOR_EXISTE, [trabajadorId]);
      if (!trabajador) throw new ForbiddenException('Primero crea tu perfil de trabajador');
      const [actual] = await this.dataSource.query(SQL_DOCUMENTO_ACTUAL, [trabajadorId, tipo]);
      if (actual?.estado === 'aprobado') throw new ConflictException('Este documento ya fue aprobado');

      const relativa = join('documentos', String(trabajadorId), `${tipo}-${Date.now()}${extension}`);
      const destino = join(this.carpetaBase(), relativa);
      await mkdir(join(this.carpetaBase(), 'documentos', String(trabajadorId)), { recursive: true });
      await writeFile(destino, archivo.buffer);

      let documento: { id: number; tipo: string; estado: string; subidoEn: Date };
      try {
        [documento] = await this.dataSource.query(SQL_GUARDAR_DOCUMENTO, [trabajadorId, tipo, relativa]);
      } catch (error) {
        await rm(destino, { force: true });
        throw error;
      }
      if (actual?.archivoUrl) await rm(join(this.carpetaBase(), actual.archivoUrl), { force: true });
      await this.dataSource.query(SQL_NOTIFICAR_ADMINS, [`Hay un documento (${tipo}) por revisar.`]);
      return { ...documento, faltan: await this.faltan(trabajadorId) };
    } catch (error) {
      throw traducirErrorBd(error);
    }
  }

  /** Mis documentos y su estado (nunca el archivo). */
  async mios(trabajadorId: number) {
    const documentos = await this.dataSource.query(SQL_MIS_DOCUMENTOS, [trabajadorId]);
    return { documentos, faltan: TIPOS_DOCUMENTO.filter((t) => !documentos.some((d: { tipo: string }) => d.tipo === t)) };
  }

  private async faltan(trabajadorId: number) {
    return (await this.mios(trabajadorId)).faltan;
  }

  /** Para que el administrador abra el archivo; evita salirse de la carpeta de documentos. */
  rutaSegura(archivoUrl: string): string | null {
    const base = this.carpetaBase();
    const ruta = resolve(base, archivoUrl);
    return ruta.startsWith(base) && extname(ruta) ? ruta : null;
  }
}
