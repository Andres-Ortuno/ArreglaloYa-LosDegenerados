import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';
import type {
  CrearSolicitud,
  DetalleSolicitud,
  ElegirPostulacion,
  MiPostulacion,
  MiSolicitud,
  PedidoNuevo,
  Postularse,
  RenovarPostulacion,
  SolicitudCreada,
  SolicitudDisponible,
} from '../../models/backend.models';

/** Solicitudes (cliente) y postulaciones (trabajador). Todas requieren sesión. */
@Injectable({ providedIn: 'root' })
export class ApiSolicitudes {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/solicitudes`;

  // ------------------------------------------------------------ cliente
  /** Pantalla «Solicitar un trabajo» (RF-05, RF-06). */
  crear(datos: CrearSolicitud): Observable<SolicitudCreada> {
    return this.http.post<SolicitudCreada>(this.url, datos);
  }

  mias(): Observable<MiSolicitud[]> {
    return this.http.get<MiSolicitud[]>(`${this.url}/mias`);
  }

  /** Mi solicitud con las postulaciones recibidas. */
  detalle(id: number): Observable<DetalleSolicitud> {
    return this.http.get<DetalleSolicitud>(`${this.url}/${id}`);
  }

  /** Elegir una postulación y un horario: nace el pedido «bajo_revision» (RF-25). */
  elegir(solicitudId: number, datos: ElegirPostulacion): Observable<PedidoNuevo> {
    return this.http.post<PedidoNuevo>(`${this.url}/${solicitudId}/elegir`, datos);
  }

  /** Cancelar una solicitud que todavía no tiene trabajador. */
  cancelar(id: number): Observable<{ id: number; estado: 'cancelada' }> {
    return this.http.post<{ id: number; estado: 'cancelada' }>(`${this.url}/${id}/cancelar`, {});
  }

  // ------------------------------------------------------------ trabajador
  /** Solicitudes pendientes de mi zona y especialidades, la más antigua primero. */
  disponibles(): Observable<SolicitudDisponible[]> {
    return this.http.get<SolicitudDisponible[]>(`${this.url}/disponibles`);
  }

  /** Postularme con monto, tipo de trabajo, costo de visita y materiales (RF-08). Solo una vez por solicitud. */
  postularse(solicitudId: number, datos: Postularse): Observable<unknown> {
    return this.http.post(`${this.url}/${solicitudId}/postulaciones`, datos);
  }

  misPostulaciones(): Observable<MiPostulacion[]> {
    return this.http.get<MiPostulacion[]>(`${API_BASE_URL}/postulaciones/mias`);
  }

  /**
   * Renovar una propuesta vencida: vuelve a «enviada» con un plazo nuevo (y, si se quiere, otro monto).
   * El backend responde 409 si no cumple las condiciones (vigente, solicitud cerrada, ya renovó 2 veces).
   */
  renovarPostulacion(postulacionId: number, datos: RenovarPostulacion = {}): Observable<unknown> {
    return this.http.post(`${API_BASE_URL}/postulaciones/${postulacionId}/renovar`, datos);
  }
}
