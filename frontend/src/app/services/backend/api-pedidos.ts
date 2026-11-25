import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';
import type {
  Calificar,
  PagarPedido,
  PedidoDetalle,
  PedidoResumen,
  ProponerCambioMonto,
  TipoReporte,
} from '../../models/backend.models';

/**
 * Pedidos: cada acción tiene su propia ruta. La pantalla no cambia el estado a mano:
 * llama a la acción y vuelve a pedir el detalle para mostrar lo que el backend decidió.
 */
@Injectable({ providedIn: 'root' })
export class ApiPedidos {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/pedidos`;

  /** Mis pedidos, como cliente y como trabajador. */
  mios(): Observable<PedidoResumen[]> {
    return this.http.get<PedidoResumen[]>(`${this.url}/mios`);
  }

  detalle(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.url}/${id}`);
  }

  // ------------------------------------------------------------ cliente
  /** CU-05: paga el anticipo (simulado). El pedido pasa a «aprobado». */
  pagarAnticipo(id: number, datos: PagarPedido): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/pagar-anticipo`, datos);
  }

  /** RF-28: paga el saldo que falta cuando el monto subió. */
  pagarSaldo(id: number, datos: PagarPedido): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/pagar-saldo`, datos);
  }

  /** CU-06: acepta o rechaza el nuevo monto propuesto. Si lo rechaza, el pedido se cancela. */
  responderCambioMonto(id: number, cambioId: number, aceptar: boolean): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/cambio-monto/${cambioId}/responder`, { aceptar });
  }

  /** CU-08: cancela antes de «en_proceso». */
  cancelar(id: number, motivo?: string): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/cancelar`, { motivo });
  }

  /** El cliente reporta que el trabajador no se presentó (solo pasada la hora acordada más el margen). */
  incumplimiento(id: number, motivo?: string): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/incumplimiento`, { motivo });
  }

  // ------------------------------------------------------------ trabajador
  /** CU-06: propone otro monto con su razón (obligatoria). */
  proponerCambioMonto(id: number, datos: ProponerCambioMonto): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/cambio-monto`, datos);
  }

  /** CU-07: «Iniciar trabajo». */
  iniciar(id: number): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/iniciar`, {});
  }

  /** CU-07: «Marcar como finalizado». Libera el pago retenido. */
  finalizar(id: number): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/finalizar`, {});
  }

  // ------------------------------------------------------------ calificaciones (CU-09)
  /** Cliente: califica al trabajador (y puede reportar). Trabajador: califica al cliente solo con estrellas. */
  calificar(id: number, datos: Calificar): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/calificar`, datos);
  }

  /** Cliente: reporta un incumplimiento, estafa o robo de un pedido finalizado o cancelado (RF-32). */
  reportar(id: number, reporte: { tipo: TipoReporte; descripcion: string }): Observable<unknown> {
    return this.http.post(`${this.url}/${id}/reportar`, reporte);
  }

  misReportes(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${API_BASE_URL}/reportes/mios`);
  }

  calificaciones(id: number): Observable<{ pedidoId: number; calificaciones: unknown[]; puedoCalificar: boolean }> {
    return this.http.get<{ pedidoId: number; calificaciones: unknown[]; puedoCalificar: boolean }>(
      `${this.url}/${id}/calificaciones`,
    );
  }
}
