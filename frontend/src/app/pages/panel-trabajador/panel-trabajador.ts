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
import {
  ApiDocumentos,
  TIPOS_DOCUMENTO,
  type DocumentoTrabajador,
  type TipoDocumento
} from '../../services/backend/api-documentos';
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
  private readonly documentosApi = inject(ApiDocumentos);

  // MI PERFIL (se edita en la pantalla «Editar perfil»)
  perfil: MiPerfilTrabajador | null = null;
  sinPerfil: boolean = false;
  errorPerfil: string = '';

  // Verificación documental (datos reales del backend)
  readonly tiposDocumentos = TIPOS_DOCUMENTO;
  tipoDocumento: TipoDocumento = 'identidad';
  archivoDocumento: File | null = null;
  documentos: DocumentoTrabajador[] = [];
  cargandoDocumentos = true;
  subiendoDocumento = false;
  errorDocumentos = '';
  mensajeDocumentos = '';

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
    this.cargarDocumentos();
    this.cargarSolicitudes();
    this.cargarPostulaciones();
  }

  // ------------------------------------------------------------ carga
  private cargarPerfil(): void {
    this.trabajadores.miPerfil().subscribe({
      next: (p) => {
        this.perfil = p;
        this.sinPerfil = false;
      },
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

  // ------------------------------------------------------------ documentos
  get documentacionAprobada(): boolean {
    return !this.cargandoDocumentos && !this.errorDocumentos &&
      this.tiposDocumentos.every((tipo) => this.documentoPorTipo(tipo)?.estado === 'aprobado');
  }

  documentoPorTipo(tipo: TipoDocumento): DocumentoTrabajador | undefined {
    return this.documentos.find((d) => d.tipo === tipo);
  }

  etiquetaDocumento(tipo: TipoDocumento): string {
    switch (tipo) {
      case 'identidad': return 'Documento de identidad';
      case 'antecedentes': return 'Certificado de antecedentes';
      case 'experiencia': return 'Constancia de experiencia';
    }
  }

  etiquetaEstadoDocumento(estado: DocumentoTrabajador['estado']): string {
    switch (estado) {
      case 'pendiente': return 'Pendiente de revisión';
      case 'aprobado': return 'Aprobado';
      case 'rechazado': return 'Observado: requiere corrección';
    }
  }

  cargarDocumentos(): void {
    this.cargandoDocumentos = true;
    this.errorDocumentos = '';
    this.documentosApi.mios().subscribe({
      next: (res) => {
        this.documentos = res.documentos;
        this.cargandoDocumentos = false;
      },
      error: (e) => {
        this.errorDocumentos = mensajeDeError(e, 'No se pudieron consultar los documentos.');
        this.cargandoDocumentos = false;
      }
    });
  }

  seleccionarDocumento(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivoDocumento = input.files?.[0] ?? null;
    this.mensajeDocumentos = '';
  }

  subirDocumento(inputArchivo: HTMLInputElement): void {
    if (this.subiendoDocumento) return;
    this.errorDocumentos = '';
    this.mensajeDocumentos = '';

    if (!this.perfil) {
      this.errorDocumentos = 'Primero debes crear tu perfil profesional.';
      return;
    }
    const actual = this.documentoPorTipo(this.tipoDocumento);
    if (actual?.estado === 'aprobado' || actual?.estado === 'pendiente') {
      this.errorDocumentos = 'Solo puedes corregir documentos observados o subir los faltantes.';
      return;
    }
    const archivo = this.archivoDocumento;
    if (!archivo) {
      this.errorDocumentos = 'Selecciona un archivo para enviar.';
      return;
    }
    const extensionValida = /\.(pdf|jpe?g|png)$/i.test(archivo.name);
    if (!extensionValida || !['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type)) {
      this.errorDocumentos = 'Solo se permiten documentos PDF, JPG o PNG.';
      return;
    }
    if (archivo.size === 0 || archivo.size > 5 * 1024 * 1024) {
      this.errorDocumentos = 'El documento debe tener contenido y no superar 5 MB.';
      return;
    }

    this.subiendoDocumento = true;
    this.documentosApi.subir(this.tipoDocumento, archivo).subscribe({
      next: () => {
        this.subiendoDocumento = false;
        this.archivoDocumento = null;
        inputArchivo.value = '';
        this.mensajeDocumentos = 'Documento enviado correctamente. Está pendiente de revisión.';
        this.cargarDocumentos();
        this.cargarPerfil();
      },
      error: (e) => {
        this.subiendoDocumento = false;
        this.errorDocumentos = mensajeDeError(e, 'No se pudo subir el documento.');
      }
    });
  }

  // ------------------------------------------------------------ postularse
  seleccionarSolicitud(id: number): void {
    if (!this.documentacionAprobada || this.perfil?.estado !== 'activo') {
      this.mensajePostulacion = 'Primero debes tener los documentos aprobados y la cuenta activa.';
      return;
    }
    this.solicitudSeleccionadaId = id;
    this.mensajePostulacion = '';
  }

  get solicitudSeleccionada(): SolicitudDisponible | null {
    return this.solicitudes.find((s) => s.id === this.solicitudSeleccionadaId) ?? null;
  }

  enviarPostulacion(formulario: NgForm): void {

    this.mensajePostulacion = '';
    this.mensajeCorrecto = false;
    if (!this.documentacionAprobada || this.perfil?.estado !== 'activo') {
      this.mensajePostulacion = 'No puedes postularte hasta tener los tres documentos aprobados y la cuenta activa.';
      return;
    }

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
