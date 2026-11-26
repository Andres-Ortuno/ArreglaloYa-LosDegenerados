
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';

export type EstadoTrabajador = 'en_revision' | 'activo' | 'suspendido';

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
}
