
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';

export type EstadoTrabajador = 'en_revision' | 'activo' | 'suspendido';

export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';

export interface TrabajadorAdmin {
  id: number;
  nombre: string;
  correo: string;
  zona: string;
  estado: EstadoTrabajador;
  bloqueadoPermanente: boolean;
  suspendidoHasta: string | null;
  subidos: number;
  aprobados: number;
  pendientes: number;
  rechazados: number;
}

// Información de los documentos de un trabajador
export interface DocumentoAdmin {
  id: number;
  tipo: string;
  estado: EstadoDocumento;
  motivoRechazo: string | null;
  subidoEn: string;
  revisadoEn: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdministradorService {

  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/admin`;

  // Obtener trabajadores según su estado
  obtenerTrabajadores(estado: EstadoTrabajador): Observable<TrabajadorAdmin[]> {
    const params = new HttpParams().set('estado', estado);

    return this.http.get<TrabajadorAdmin[]>(
      `${this.url}/trabajadores`,
      { params }
    );
  }

  // Obtener documentos de un trabajador
  obtenerDocumentos(trabajadorId: number): Observable<DocumentoAdmin[]> {
    return this.http.get<DocumentoAdmin[]>(
      `${this.url}/trabajadores/${trabajadorId}/documentos`
    );
  }

  // Obtener el archivo de un documento
  obtenerArchivoDocumento(documentoId: number): Observable<Blob> {
    return this.http.get(
      `${this.url}/documentos/${documentoId}/archivo`,
      { responseType: 'blob' }
    );
  }
}
