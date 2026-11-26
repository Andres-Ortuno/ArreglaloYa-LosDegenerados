import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';
import type { EstadoTrabajador, TipoReporte } from '../../models/backend.models';

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

export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocumentoAdmin {
  id: number;
  tipo: string;
  estado: EstadoDocumento;
  motivoRechazo: string | null;
  subidoEn: string;
  revisadoEn: string | null;
}

export type EstadoReporte = 'pendiente' | 'valido' | 'rechazado';

export interface ReporteAdmin {
  id: number;
  pedidoId: number;
  tipo: TipoReporte;
  descripcion: string;
  estado: EstadoReporte;
  creadoEn: string;
  validadoEn: string | null;
  cliente: string;
  trabajador: string;
  trabajadorId: number;
}

export interface FlujoEconomico {
  desde: string | null;
  hasta: string | null;
  totales: { totalPagado: number; retenido: number; liberado: number; reembolsado: number; comision: number };
  dias: { fecha: string; totalPagado: number; retenido: number; liberado: number; reembolsado: number; comision: number }[];
}

/** Rutas del administrador (/api/admin/...). Solo funcionan con una cuenta de administrador. */
@Injectable({ providedIn: 'root' })
export class ApiAdmin {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/admin`;

  trabajadores(estado: EstadoTrabajador): Observable<TrabajadorAdmin[]> {
    return this.http.get<TrabajadorAdmin[]>(`${this.url}/trabajadores`, { params: { estado } });
  }

  documentosDe(trabajadorId: number): Observable<DocumentoAdmin[]> {
    return this.http.get<DocumentoAdmin[]>(`${this.url}/trabajadores/${trabajadorId}/documentos`);
  }

  /** El archivo pide el token, por eso se descarga como Blob y no como un enlace simple. */
  archivo(documentoId: number): Observable<Blob> {
    return this.http.get(`${this.url}/documentos/${documentoId}/archivo`, { responseType: 'blob' });
  }

  aprobarDocumento(id: number): Observable<{ documentoId: number; estado: string; cuentaActivada: boolean }> {
    return this.http.post<{ documentoId: number; estado: string; cuentaActivada: boolean }>(
      `${this.url}/documentos/${id}/aprobar`,
      {},
    );
  }

  rechazarDocumento(id: number, motivo: string): Observable<unknown> {
    return this.http.post(`${this.url}/documentos/${id}/rechazar`, { motivo });
  }

  reportes(estado: EstadoReporte): Observable<ReporteAdmin[]> {
    return this.http.get<ReporteAdmin[]>(`${this.url}/reportes`, { params: { estado } });
  }

  /** Si el reporte es por robo, la denuncia policial es obligatoria. */
  validarReporte(id: number, denunciaPolicial?: string): Observable<unknown> {
    return this.http.post(`${this.url}/reportes/${id}/validar`, denunciaPolicial ? { denunciaPolicial } : {});
  }

  rechazarReporte(id: number, motivo?: string): Observable<unknown> {
    return this.http.post(`${this.url}/reportes/${id}/rechazar`, motivo ? { motivo } : {});
  }

  flujoEconomico(desde?: string, hasta?: string): Observable<FlujoEconomico> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<FlujoEconomico>(`${this.url}/flujo-economico`, { params });
  }
}
