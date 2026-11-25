import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type {
  MiPerfilTrabajador,
  MiPostulacion,
  SolicitudDisponible,
  TipoTrabajo
} from '../../models/backend.models';
import { ApiSolicitudes } from '../../services/backend/api-solicitudes';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-panel-trabajador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './panel-trabajador.html',
  styleUrl: './panel-trabajador.css'
})
export class PanelTrabajador implements OnInit {

  private readonly trabajadores = inject(ApiTrabajadores);
  private readonly solicitudesApi = inject(ApiSolicitudes);

  // MI PERFIL (se edita en la pantalla «Editar perfil»)
  perfil: MiPerfilTrabajador | null = null;
  sinPerfil: boolean = false;
  errorPerfil: string = '';

  // DOCUMENTO DE DEMOSTRACIÓN
  nombreDocumento: string = '';

  // SOLICITUDES DISPONIBLES
  solicitudes: SolicitudDisponible[] = [];
  cargandoSolicitudes: boolean = true;
  errorSolicitudes: string = '';

  // POSTULACIÓN
  solicitudSeleccionadaId: number | null = null;
  monto: number | null = null;
  tipoTrabajo: TipoTrabajo = 'visita';
  costoVisita: number | null = 0;
  incluyeMateriales: boolean = false;
  mensajePostulacion: string = '';
  mensajeCorrecto: boolean = false;
  enviando: boolean = false;

  // MIS POSTULACIONES
  postulaciones: MiPostulacion[] = [];

  ngOnInit(): void {
    this.cargarPerfil();
    this.cargarSolicitudes();
    this.cargarPostulaciones();
  }

  // ------------------------------------------------------------ carga
  private cargarPerfil(): void {
    this.trabajadores.miPerfil().subscribe({
      next: (p) => (this.perfil = p),
      error: (e) => {
        if (e?.status === 404) this.sinPerfil = true;
        else this.errorPerfil = mensajeDeError(e);
      }
    });
  }

  private cargarSolicitudes(): void {
    this.cargandoSolicitudes = true;
    this.solicitudesApi.disponibles().subscribe({
      next: (lista) => {
        this.solicitudes = lista;
        this.cargandoSolicitudes = false;
      },
      error: (e) => {
        this.errorSolicitudes = mensajeDeError(e);
        this.cargandoSolicitudes = false;
      }
    });
  }

  private cargarPostulaciones(): void {
    this.solicitudesApi.misPostulaciones().subscribe({
      next: (lista) => (this.postulaciones = lista),
      error: () => (this.postulaciones = [])
    });
  }

  // ------------------------------------------------------------ documentos (todavía de demostración)
  seleccionarDocumento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    this.nombreDocumento = archivo ? archivo.name : '';
  }

  // ------------------------------------------------------------ postularse
  seleccionarSolicitud(id: number): void {
    this.solicitudSeleccionadaId = id;
    this.mensajePostulacion = '';
  }

  get solicitudSeleccionada(): SolicitudDisponible | null {
    return this.solicitudes.find((s) => s.id === this.solicitudSeleccionadaId) ?? null;
  }

  enviarPostulacion(formulario: NgForm): void {

    this.mensajePostulacion = '';
    this.mensajeCorrecto = false;

    const solicitud = this.solicitudSeleccionada;

    if (!solicitud) {
      this.mensajePostulacion = 'Primero selecciona una solicitud disponible.';
      return;
    }

    if (solicitud.yaPostulado) {
      this.mensajePostulacion = 'Ya te postulaste a esta solicitud.';
      return;
    }

    const costo = this.tipoTrabajo === 'visita' ? (this.costoVisita ?? 0) : 0;

    if (
      formulario.invalid ||
      this.monto === null ||
      !Number.isFinite(this.monto) ||
      this.monto <= 0 ||
      costo < 0
    ) {
      formulario.form.markAllAsTouched();
      this.mensajePostulacion = 'Revisa el monto y el costo de la visita.';
      return;
    }

    this.enviando = true;
    this.solicitudesApi.postularse(solicitud.id, {
      monto: this.monto,
      tipoTrabajo: this.tipoTrabajo,
      costoVisita: costo,
      incluyeMateriales: this.incluyeMateriales
    }).subscribe({
      next: () => {
        this.enviando = false;
        this.mensajeCorrecto = true;
        this.mensajePostulacion = 'Propuesta enviada. El cliente fue notificado.';
        this.solicitudSeleccionadaId = null;
        this.monto = null;
        this.costoVisita = 0;
        this.incluyeMateriales = false;
        this.tipoTrabajo = 'visita';
        formulario.resetForm({ tipoTrabajo: 'visita', costoVisita: 0, incluyeMateriales: false });
        this.cargarSolicitudes();
        this.cargarPostulaciones();
      },
      error: (e) => {
        this.enviando = false;
        this.mensajePostulacion = mensajeDeError(e, 'No se pudo enviar la propuesta.');
      }
    });
  }
}
