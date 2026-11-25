import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Especialidad, TrabajadorPublico, Zona } from '../../models/backend.models';
import { ApiCatalogos } from '../../services/backend/api-catalogos';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-buscar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './buscar.html',
  styleUrl: './buscar.css'
})
export class Buscar implements OnInit {

  private readonly catalogos = inject(ApiCatalogos);
  private readonly trabajadoresApi = inject(ApiTrabajadores);

  // Filtros: la zona y la especialidad las filtra el backend; el texto, aquí
  zonaId: string = '';
  especialidadId: string = '';
  busqueda: string = '';

  zonas: Zona[] = [];
  especialidades: Especialidad[] = [];
  trabajadores: TrabajadorPublico[] = [];

  cargando: boolean = true;
  error: string = '';

  ngOnInit(): void {
    this.catalogos.zonas().subscribe({ next: (l) => (this.zonas = l), error: (e) => (this.error = mensajeDeError(e)) });
    this.catalogos.especialidades().subscribe({ next: (l) => (this.especialidades = l), error: (e) => (this.error = mensajeDeError(e)) });
    this.buscar();
  }

  /** Pide al backend los trabajadores activos de la zona y especialidad elegidas (RF-07). */
  buscar(): void {
    this.cargando = true;
    this.error = '';
    this.trabajadoresApi.buscar({
      zonaId: this.zonaId ? Number(this.zonaId) : null,
      especialidadId: this.especialidadId ? Number(this.especialidadId) : null
    }).subscribe({
      next: (lista) => {
        this.trabajadores = lista;
        this.cargando = false;
      },
      error: (e) => {
        this.error = mensajeDeError(e);
        this.cargando = false;
      }
    });
  }

  /** Filtro por texto (nombre, zona o especialidad) sobre lo que ya llegó */
  get trabajadoresFiltrados(): TrabajadorPublico[] {
    const texto = this.busqueda.toLowerCase().trim();
    if (!texto) return this.trabajadores;

    return this.trabajadores.filter((t) =>
      t.nombre.toLowerCase().includes(texto) ||
      t.zona.toLowerCase().includes(texto) ||
      t.especialidades.some((e) => e.toLowerCase().includes(texto))
    );
  }
}
