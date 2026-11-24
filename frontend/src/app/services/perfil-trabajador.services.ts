
import { Injectable, signal } from '@angular/core';

// IMPORTAR EL MODELO DEL PERFIL
import type {
  PerfilProfesional
} from '../models/perfil-profesional.model';

// CONSERVAR LA EXPORTACIÓN PARA LAS OTRAS PÁGINAS
export type {
  PerfilProfesional
} from '../models/perfil-profesional.model';

@Injectable({
  providedIn: 'root'
})
export class PerfilTrabajadorService {

  // DATOS INICIALES DEL PERFIL
  private readonly _perfil = signal<PerfilProfesional>({
    nombre: 'Perfil de ejemplo',
    especialidad: 'Albañilería',
    zona: 'Cercado',
    descripcion:
      'Realizo reparaciones generales del hogar.',
    disponibilidad: 'Tardes'
  });

  // PERMITIR CONSULTAR LOS DATOS
  readonly perfil = this._perfil.asReadonly();

  // GUARDAR CAMBIOS EN EL PERFIL
  guardarPerfil(datos: PerfilProfesional): void {

    this._perfil.set({
      ...datos
    });

  }
}
