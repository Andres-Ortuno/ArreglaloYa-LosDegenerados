
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from
  '../../config/api.config';

import type {
  PerfilProfesional
} from '../../models/perfil-profesional.model';

import { EstadoHttp } from './estado-http';

@Injectable({
  providedIn: 'root'
})
export class PerfilApiService {

  private readonly http = inject(HttpClient);

  // Dirección provisional del backend
  private readonly url = `${API_BASE_URL}/perfiles`;

  // Estados de carga, éxito y error
  readonly estado = new EstadoHttp();

  // OBTENER PERFILES
  obtenerPerfiles(): Observable<PerfilProfesional[]> {

    return this.estado.ejecutar(
      () => this.http.get<PerfilProfesional[]>(
        this.url
      ),
      'Perfiles cargados correctamente.'
    );
  }

  // OBTENER PERFIL POR ID
  obtenerPerfil(
    id: number
  ): Observable<PerfilProfesional> {

    return this.estado.ejecutar(
      () => this.http.get<PerfilProfesional>(
        `${this.url}/${id}`
      ),
      'Perfil cargado correctamente.'
    );
  }

  // CREAR PERFIL
  crearPerfil(
    datos: PerfilProfesional
  ): Observable<PerfilProfesional> {

    return this.estado.ejecutar(
      () => this.http.post<PerfilProfesional>(
        this.url,
        datos
      ),
      'Perfil creado correctamente.'
    );
  }

  // ACTUALIZAR PERFIL
  actualizarPerfil(
    id: number,
    cambios: Partial<PerfilProfesional>
  ): Observable<PerfilProfesional> {

    return this.estado.ejecutar(
      () => this.http.patch<PerfilProfesional>(
        `${this.url}/${id}`,
        cambios
      ),
      'Perfil actualizado correctamente.'
    );
  }
}
