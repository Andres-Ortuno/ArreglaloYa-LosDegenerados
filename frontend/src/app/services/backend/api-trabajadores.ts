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
export interface ResultadoBusquedaTrabajadores {
  datos: TrabajadorPublico[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

@Injectable({ providedIn: 'root' })
export class ApiTrabajadores {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_BASE_URL}/trabajadores`;

  /** Buscar trabajadores activos (RF-07). Sin filtros devuelve todos. */
  buscar(
  filtros: {
    zonaId?: number | null;
    especialidadId?: number | null;
    calificacionMinima?: number | null;
    pagina?: number;
    limite?: number;
    ordenarPor?: 'calificacion' | 'opiniones' | 'nombre';
  } = {},
): Observable<ResultadoBusquedaTrabajadores> {
  let params = new HttpParams();

  if (filtros.zonaId) {
    params = params.set('zonaId', filtros.zonaId);
  }

  if (filtros.especialidadId) {
    params = params.set('especialidadId', filtros.especialidadId);
  }

  if (filtros.calificacionMinima != null) {
    params = params.set('calificacionMinima', filtros.calificacionMinima);
  }

  if (filtros.pagina) {
    params = params.set('pagina', filtros.pagina);
  }

  if (filtros.limite) {
    params = params.set('limite', filtros.limite);
  }

  if (filtros.ordenarPor) {
    params = params.set('ordenarPor', filtros.ordenarPor);
  }

  return this.http.get<ResultadoBusquedaTrabajadores>(this.url, { params });
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
