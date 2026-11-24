
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from
  '../../config/api.config';

import type {
  DatosSolicitud,
  Pedido
} from '../../models/pedido.model';

import { EstadoHttp } from './estado-http';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesApiService {

  private readonly http = inject(HttpClient);

  // Dirección provisional del backend
  private readonly url = `${API_BASE_URL}/pedidos`;

  // Estados de carga, éxito y error
  readonly estado = new EstadoHttp();

  // OBTENER PEDIDOS
  obtenerPedidos(): Observable<Pedido[]> {

    return this.estado.ejecutar(
      () => this.http.get<Pedido[]>(this.url),
      'Pedidos cargados correctamente.'
    );
  }

  // CREAR PEDIDO
  crearPedido(
    datos: DatosSolicitud
  ): Observable<Pedido> {

    return this.estado.ejecutar(
      () => this.http.post<Pedido>(
        this.url,
        datos
      ),
      'Pedido creado correctamente.'
    );
  }

  // ACTUALIZAR PEDIDO
  actualizarPedido(
    id: number,
    cambios: Partial<Pedido>
  ): Observable<Pedido> {

    return this.estado.ejecutar(
      () => this.http.patch<Pedido>(
        `${this.url}/${id}`,
        cambios
      ),
      'Pedido actualizado correctamente.'
    );
  }
}
