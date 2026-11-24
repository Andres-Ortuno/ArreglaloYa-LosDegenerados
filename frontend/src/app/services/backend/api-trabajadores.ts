import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';
import type {
  GuardarPerfilTrabajador,
  MiPerfilTrabajador,
  OpinionesTrabajador,
  TrabajadorPublico,
} from '../../models/backend.models';

@Injectable({ providedIn: 'root' })
export class ApiTrabajadores {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/trabajadores`;

  /** Buscar trabajadores activos (RF-07). Sin filtros devuelve todos. */
  buscar(filtros: { zonaId?: number | null; especialidadId?: number | null } = {}): Observable<TrabajadorPublico[]> {
    let params = new HttpParams();
    if (filtros.zonaId) params = params.set('zonaId', filtros.zonaId);
    if (filtros.especialidadId) params = params.set('especialidadId', filtros.especialidadId);
    return this.http.get<TrabajadorPublico[]>(this.url, { params });
  }

  perfilPublico(id: number): Observable<TrabajadorPublico> {
    return this.http.get<TrabajadorPublico>(`${this.url}/${id}`);
  }

  opiniones(id: number, pagina = 1): Observable<OpinionesTrabajador> {
    return this.http.get<OpinionesTrabajador>(`${this.url}/${id}/opiniones`, { params: { pagina } });
  }

  /** Trabajador con sesión: su propio perfil (RF-02). */
  miPerfil(): Observable<MiPerfilTrabajador> {
    return this.http.get<MiPerfilTrabajador>(`${this.url}/me`);
  }

  /** Crea o actualiza mi perfil. Un perfil nuevo queda «en revisión» hasta que lo verifique el administrador. */
  guardarMiPerfil(datos: GuardarPerfilTrabajador): Observable<MiPerfilTrabajador> {
    return this.http.put<MiPerfilTrabajador>(`${this.url}/me`, datos);
  }
}
