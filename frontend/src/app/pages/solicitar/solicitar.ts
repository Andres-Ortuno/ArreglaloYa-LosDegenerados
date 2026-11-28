import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Especialidad, SolicitudCreada, Zona } from '../../models/backend.models';
import { ApiCatalogos } from '../../services/backend/api-catalogos';
import { ApiSolicitudes } from '../../services/backend/api-solicitudes';
import { mensajeDeError } from '../../services/backend/errores';

/** Un horario en el que el cliente puede recibir al trabajador */
interface HorarioForm {
  fecha: string;       // 2026-12-01
  horaInicio: string;  // 10:00
  horaFin: string;     // 12:00
}

const MAX_HORARIOS = 3;

@Component({
  selector: 'app-solicitar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './solicitar.html',
  styleUrl: './solicitar.css'
})
export class Solicitar implements OnInit {

  private readonly catalogos = inject(ApiCatalogos);
  private readonly solicitudes = inject(ApiSolicitudes);
  private readonly cdr = inject(ChangeDetectorRef);

  // Listas que llegan del backend
  zonas: Zona[] = [];
  especialidades: Especialidad[] = [];

  // Se guardan los números (id) de la especialidad y la zona
  especialidad: string = '';
  zona: string = '';
  descripcion: string = '';
  ubicacion: string = '';
  fotoUrl: string = '';

  horarios: HorarioForm[] = [{ fecha: '', horaInicio: '', horaFin: '' }];
  readonly maxHorarios = MAX_HORARIOS;

  mensaje: string = '';
  enviando: boolean = false;
  creada: SolicitudCreada | null = null;

  ngOnInit(): void {
    this.catalogos.zonas().subscribe({
      next: (l) => {
        this.zonas = l;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.mensaje = mensajeDeError(e);
        this.cdr.markForCheck();
      }
    });
    this.catalogos.especialidades().subscribe({
      next: (l) => {
        this.especialidades = l;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.mensaje = mensajeDeError(e);
        this.cdr.markForCheck();
      }
    });
  }

  /** Hoy en formato AAAA-MM-DD (hora local), para no permitir fechas pasadas */
  get hoy(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  agregarHorario(): void {
    if (this.horarios.length < MAX_HORARIOS) {
      this.horarios.push({ fecha: '', horaInicio: '', horaFin: '' });
    }
  }

  quitarHorario(indice: number): void {
    if (this.horarios.length > 1) this.horarios.splice(indice, 1);
  }

  /** Revisa los horarios y devuelve un texto de error, o null si están bien */
  private errorDeHorarios(): string | null {
    for (const h of this.horarios) {
      if (!h.fecha || !h.horaInicio || !h.horaFin) {
        return 'Completa la fecha, la hora de inicio y la hora de fin de cada horario.';
      }
      if (h.horaFin <= h.horaInicio) {
        return 'En cada horario, la hora de fin debe ser posterior a la de inicio.';
      }
      if (new Date(`${h.fecha}T${h.horaInicio}:00`).getTime() <= Date.now()) {
        return 'Los horarios deben ser en el futuro.';
      }
    }
    return null;
  }

  enviarSolicitud(formulario: NgForm): void {

    // Limpiar mensajes anteriores
    this.mensaje = '';
    this.creada = null;

    const descripcion = this.descripcion.trim();
    const ubicacion = this.ubicacion.trim();
    const foto = this.fotoUrl.trim();

    // Validar campos obligatorios y longitudes
    if (
      formulario.invalid ||
      !this.especialidad ||
      !this.zona ||
      descripcion.length < 15 ||
      ubicacion.length < 5
    ) {
      formulario.control.markAllAsTouched();

      this.mensaje =
        'No se pudo crear la solicitud. ' +
        'Revisa los campos obligatorios: ' +
        'especialidad, zona, descripción (mínimo 15 caracteres) ' +
        'y ubicación (mínimo 5 caracteres).';

      return;
    }

    const errorHorario = this.errorDeHorarios();
    if (errorHorario) {
      this.mensaje = errorHorario;
      return;
    }

    if (foto && !/^https?:\/\/\S+$/i.test(foto)) {
      this.mensaje = 'El enlace de la foto debe empezar con http:// o https://';
      return;
    }

    this.enviando = true;
    this.solicitudes.crear({
      especialidadId: Number(this.especialidad),
      zonaId: Number(this.zona),
      descripcion,
      ubicacion,
      fotos: foto ? [foto] : undefined,
      // Hora local de Bolivia, sin zona horaria (como la guarda el backend)
      horarios: this.horarios.map((h) => ({
        inicio: `${h.fecha}T${h.horaInicio}:00`,
        fin: `${h.fecha}T${h.horaFin}:00`
      }))
    }).subscribe({
      next: (solicitud) => {
        this.enviando = false;
        this.creada = solicitud;
        this.mensaje = solicitud.mensaje;
        formulario.resetForm();
        this.especialidad = '';
        this.zona = '';
        this.horarios = [{ fecha: '', horaInicio: '', horaFin: '' }];
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.enviando = false;
        this.mensaje = mensajeDeError(e, 'No se pudo crear la solicitud. Inténtalo de nuevo.');
        this.cdr.markForCheck();
      }
    });
  }
}
