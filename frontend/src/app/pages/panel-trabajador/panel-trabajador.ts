import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  MAX_RENOVACIONES,
  PLAZO_MAXIMO_HORAS,
  PLAZO_MINIMO_HORAS,
  PLAZO_POR_DEFECTO_HORAS,
  type MiPerfilTrabajador,
  type MiPostulacion,
  type RenovarPostulacion,
  type SolicitudDisponible,
  type TipoTrabajo
} from '../../models/backend.models';
import { ApiSolicitudes } from '../../services/backend/api-solicitudes';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-panel-trabajador',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './panel-trabajador.html',
  styleUrl: './panel-trabajador.css'
})
export class PanelTrabajador implements OnInit {

  private readonly trabajadores = inject(ApiTrabajadores);
  private readonly solicitudesApi = inject(ApiSolicitudes);

  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * Esta aplicación no usa zone.js (Angular 22 trabaja sin zonas). Cuando llega una respuesta
   * del servidor, Angular no redibuja solo: hay que avisarle con markForCheck().
   */
  private refrescar(): void {
    this.cdr.markForCheck();
  }

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
  plazoHoras: number | null = PLAZO_POR_DEFECTO_HORAS;
  mensajePostulacion: string = '';
  mensajeCorrecto: boolean = false;
  enviando: boolean = false;

  // Límites que se muestran en el formulario (los mismos del backend)
  readonly plazoMinimo = PLAZO_MINIMO_HORAS;
  readonly plazoMaximo = PLAZO_MAXIMO_HORAS;
  readonly maxRenovaciones = MAX_RENOVACIONES;

  // MIS POSTULACIONES
  postulaciones: MiPostulacion[] = [];

  // RENOVACIÓN de propuestas vencidas (un plazo y un monto opcional por propuesta)
  plazoRenovacion: Record<number, number | null> = {};
  montoRenovacion: Record<number, number | null> = {};
  renovando: boolean = false;
  mensajePropuestas: string = '';
  mensajePropuestasCorrecto: boolean = false;

  ngOnInit(): void {
    this.cargarPerfil();
    this.cargarSolicitudes();
    this.cargarPostulaciones();
  }

  // ------------------------------------------------------------ carga
  private cargarPerfil(): void {
    this.trabajadores.miPerfil().pipe(finalize(() => this.refrescar())).subscribe({
      next: (p) => (this.perfil = p),
      error: (e) => {
        if (e?.status === 404) this.sinPerfil = true;
        else this.errorPerfil = mensajeDeError(e);
      }
    });
  }

  private cargarSolicitudes(): void {
    this.cargandoSolicitudes = true;
    this.solicitudesApi.disponibles().pipe(finalize(() => this.refrescar())).subscribe({
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
    this.solicitudesApi.misPostulaciones().pipe(finalize(() => this.refrescar())).subscribe({
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

    // El plazo es opcional: vacío = el plazo normal (48 horas). Si lo escribe, debe ser un entero válido.
    if (this.plazoHoras !== null && !this.plazoValido(this.plazoHoras)) {
      this.mensajePostulacion =
        `El plazo debe ser un número entero de horas, entre ${PLAZO_MINIMO_HORAS} y ${PLAZO_MAXIMO_HORAS}.`;
      return;
    }

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
      incluyeMateriales: this.incluyeMateriales,
      ...(this.plazoHoras !== null ? { plazoHoras: this.plazoHoras } : {})
    }).pipe(finalize(() => this.refrescar())).subscribe({
      next: () => {
        this.enviando = false;
        this.mensajeCorrecto = true;
        this.mensajePostulacion = 'Propuesta enviada. El cliente fue notificado.';
        this.solicitudSeleccionadaId = null;
        this.monto = null;
        this.costoVisita = 0;
        this.incluyeMateriales = false;
        this.tipoTrabajo = 'visita';
        this.plazoHoras = PLAZO_POR_DEFECTO_HORAS;
        formulario.resetForm({
          tipoTrabajo: 'visita',
          costoVisita: 0,
          incluyeMateriales: false,
          plazoHoras: PLAZO_POR_DEFECTO_HORAS
        });
        this.cargarSolicitudes();
        this.cargarPostulaciones();
      },
      error: (e) => {
        this.enviando = false;
        this.mensajePostulacion = mensajeDeError(e, 'No se pudo enviar la propuesta.');
      }
    });
  }

  // ------------------------------------------------------------ renovar propuestas vencidas
  private plazoValido(horas: number): boolean {
    return Number.isInteger(horas) && horas >= PLAZO_MINIMO_HORAS && horas <= PLAZO_MAXIMO_HORAS;
  }

  /** Por qué una propuesta vencida ya no se puede renovar (el backend decide con `puedeRenovar`). */
  motivoSinRenovar(post: MiPostulacion): string {
    if (post.renovaciones >= MAX_RENOVACIONES) {
      return `Ya renovaste esta propuesta ${MAX_RENOVACIONES} veces: no se puede renovar más.`;
    }
    return 'La solicitud ya no está disponible, así que no se puede renovar.';
  }

  renovar(post: MiPostulacion): void {
    if (this.renovando) return;

    const horas = this.plazoRenovacion[post.id] ?? PLAZO_POR_DEFECTO_HORAS;
    const monto = this.montoRenovacion[post.id] ?? null;

    if (!this.plazoValido(horas)) {
      this.avisarPropuestas(
        `El plazo debe ser un número entero de horas, entre ${PLAZO_MINIMO_HORAS} y ${PLAZO_MAXIMO_HORAS}.`,
        false
      );
      return;
    }
    if (monto !== null && (!Number.isFinite(monto) || monto <= 0)) {
      this.avisarPropuestas('El monto nuevo debe ser mayor que cero (o déjalo vacío para conservar el actual).', false);
      return;
    }

    const datos: RenovarPostulacion = { plazoHoras: horas, ...(monto !== null ? { monto } : {}) };

    this.renovando = true;
    this.solicitudesApi.renovarPostulacion(post.id, datos).pipe(finalize(() => this.refrescar())).subscribe({
      next: () => {
        this.renovando = false;
        delete this.plazoRenovacion[post.id];
        delete this.montoRenovacion[post.id];
        this.avisarPropuestas('Propuesta renovada. El cliente fue notificado.', true);
        this.cargarPostulaciones();
        this.cargarSolicitudes();
      },
      error: (e) => {
        this.renovando = false;
        this.avisarPropuestas(mensajeDeError(e, 'No se pudo renovar la propuesta.'), false);
        this.cargarPostulaciones(); // por si el estado cambió mientras tanto
      }
    });
  }

  private avisarPropuestas(texto: string, correcto: boolean): void {
    this.mensajePropuestas = texto;
    this.mensajePropuestasCorrecto = correcto;
  }
}
