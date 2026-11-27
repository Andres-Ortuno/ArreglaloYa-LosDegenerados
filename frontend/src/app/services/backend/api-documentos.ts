import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../config/api.config';

export const TIPOS_DOCUMENTO = ['identidad', 'antecedentes', 'experiencia'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocumentoTrabajador {
  id: number;
  tipo: TipoDocumento;
  estado: EstadoDocumento;
  motivoRechazo: string | null;
  subidoEn: string;
  revisadoEn: string | null;
}

export interface MisDocumentos {
  documentos: DocumentoTrabajador[];
  faltan: TipoDocumento[];
}

@Injectable({ providedIn: 'root' })
export class ApiDocumentos {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/trabajadores/me/documentos`;

  mios(): Observable<MisDocumentos> {
    return this.http.get<MisDocumentos>(this.url);
  }

  subir(tipo: TipoDocumento, archivo: File): Observable<unknown> {
    const datos = new FormData();
    datos.append('tipo', tipo);
    datos.append('archivo', archivo, archivo.name);
    return this.http.post(this.url, datos);
  }
}
