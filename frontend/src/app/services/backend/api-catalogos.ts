import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../config/api.config';
import type { Especialidad, Zona } from '../../models/backend.models';

/** Listas públicas que llenan los formularios (no necesitan sesión). */
@Injectable({ providedIn: 'root' })
export class ApiCatalogos {
  private readonly http = inject(HttpClient);

  zonas(): Observable<Zona[]> {
    return this.http.get<Zona[]>(`${API_BASE_URL}/zonas`);
  }

  especialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${API_BASE_URL}/especialidades`);
  }
}
