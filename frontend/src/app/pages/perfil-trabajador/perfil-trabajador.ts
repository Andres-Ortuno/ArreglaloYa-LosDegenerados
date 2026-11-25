import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { OpinionesTrabajador, TrabajadorPublico } from '../../models/backend.models';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-perfil-trabajador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil-trabajador.html',
  styleUrl: './perfil-trabajador.css'
})
export class PerfilTrabajador implements OnInit {

  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(ApiTrabajadores);

  trabajador: TrabajadorPublico | null = null;
  opiniones: OpinionesTrabajador | null = null;

  cargando: boolean = true;
  noEncontrado: boolean = false;
  error: string = '';

  ngOnInit(): void {
    // El perfil se pide al backend según el número de la dirección: /perfil-trabajador/:id
    this.ruta.paramMap.subscribe((params) => this.cargar(Number(params.get('id'))));
  }

  private cargar(id: number): void {
    this.cargando = true;
    this.noEncontrado = false;
    this.error = '';
    this.trabajador = null;
    this.opiniones = null;

    if (!Number.isInteger(id) || id <= 0) {
      this.noEncontrado = true;
      this.cargando = false;
      return;
    }

    this.api.perfilPublico(id).subscribe({
      next: (t) => {
        this.trabajador = t;
        this.cargando = false;
        this.api.opiniones(id).subscribe({ next: (o) => (this.opiniones = o) });
      },
      error: (e) => {
        this.cargando = false;
        // 404: no existe o todavía no está activo
        if (e?.status === 404) this.noEncontrado = true;
        else this.error = mensajeDeError(e);
      }
    });
  }

  /** Iniciales del nombre para el círculo del perfil */
  get iniciales(): string {
    return (this.trabajador?.nombre ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || '?';
  }
}
