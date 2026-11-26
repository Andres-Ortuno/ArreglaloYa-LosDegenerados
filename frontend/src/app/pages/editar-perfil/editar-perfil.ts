import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import type {
  Especialidad,
  EstadoTrabajador,
  GuardarPerfilTrabajador,
  MiPerfilTrabajador,
  Zona
} from '../../models/backend.models';
import { ApiCatalogos } from '../../services/backend/api-catalogos';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-editar-perfil',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css'
})
export class EditarPerfil implements OnInit {

  private readonly catalogos = inject(ApiCatalogos);
  private readonly trabajadores = inject(ApiTrabajadores);

  // Listas que llegan del backend
  zonas: Zona[] = [];
  especialidades: Especialidad[] = [];

  // Datos del formulario
  zonaId: number | null = null;
  especialidadIds: number[] = [];
  historial: string = '';
  anticipoMinimo: number | null = null;
  margenMinutos: number | null = null;
  qrPagoUrl: string = '';

  // Estado del perfil que tiene guardado el backend (null = todavía no creó su perfil)
  estadoPerfil: EstadoTrabajador | null = null;

  cargando: boolean = true;
  guardando: boolean = false;
  mensaje: string = '';
  perfilActualizado: boolean = false;

  ngOnInit(): void {
    forkJoin({
      zonas: this.catalogos.zonas(),
      especialidades: this.catalogos.especialidades()
    }).subscribe({
      next: (listas) => {
        this.zonas = listas.zonas;
        this.especialidades = listas.especialidades;
        this.cargarMiPerfil();
      },
      error: (e) => {
        this.cargando = false;
        this.mensaje = mensajeDeError(e);
      }
    });
  }

  private cargarMiPerfil(): void {
    this.trabajadores.miPerfil().subscribe({
      next: (perfil) => {
        this.rellenar(perfil);
        this.cargando = false;
      },
      error: (e) => {
        this.cargando = false;
        // 404 = todavía no creó su perfil: se deja el formulario vacío para crearlo.
        if (e?.status !== 404) this.mensaje = mensajeDeError(e);
      }
    });
  }

  private rellenar(perfil: MiPerfilTrabajador): void {
    this.zonaId = perfil.zonaId;
    this.especialidadIds = [...perfil.especialidadIds];
    this.historial = perfil.historial ?? '';
    this.anticipoMinimo = perfil.anticipoMinimo;
    this.margenMinutos = perfil.margenMinutos;
    this.qrPagoUrl = perfil.qrPagoUrl ?? '';
    this.estadoPerfil = perfil.estado;
  }

  estaMarcada(id: number): boolean {
    return this.especialidadIds.includes(id);
  }

  alternarEspecialidad(id: number, marcada: boolean): void {
    this.especialidadIds = marcada
      ? [...this.especialidadIds.filter((x) => x !== id), id]
      : this.especialidadIds.filter((x) => x !== id);
  }

  textoEstado(): string {
    switch (this.estadoPerfil) {
      case 'activo': return 'Tu perfil está verificado y visible para los clientes.';
      case 'en_revision': return 'Tu perfil está en revisión. Los clientes lo verán cuando el administrador lo verifique.';
      case 'suspendido': return 'Tu perfil está suspendido. Contacta al administrador.';
      default: return 'Todavía no creaste tu perfil. Al guardarlo quedará en revisión.';
    }
  }

  guardarCambios(formulario: NgForm): void {

    this.mensaje = '';
    this.perfilActualizado = false;

    const historial = this.historial.trim();

    if (
      this.zonaId === null ||
      this.especialidadIds.length < 1 ||
      this.especialidadIds.length > 5 ||
      historial.length < 15
    ) {
      formulario.form.markAllAsTouched();
      this.mensaje =
        'No se pudo guardar. Elige una zona, ' +
        'de 1 a 5 especialidades y escribe una descripción ' +
        'de al menos 15 caracteres.';
      return;
    }

    const datos: GuardarPerfilTrabajador = {
      zonaId: this.zonaId,
      especialidadIds: this.especialidadIds,
      historial
    };
    if (this.anticipoMinimo !== null) datos.anticipoMinimo = this.anticipoMinimo;
    if (this.margenMinutos !== null) datos.margenMinutos = this.margenMinutos;
    if (this.qrPagoUrl.trim()) datos.qrPagoUrl = this.qrPagoUrl.trim();

    this.guardando = true;

    this.trabajadores.guardarMiPerfil(datos).subscribe({
      next: (perfil) => {
        this.guardando = false;
        this.rellenar(perfil);
        this.perfilActualizado = true;
        this.mensaje = 'Perfil guardado correctamente.';
      },
      error: (e) => {
        this.guardando = false;
        this.mensaje = mensajeDeError(e);
      }
    });
  }
}
