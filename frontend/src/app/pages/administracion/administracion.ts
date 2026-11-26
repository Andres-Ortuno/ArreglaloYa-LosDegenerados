
import { Component, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  AdministradorService,
  EstadoTrabajador as EstadoBackend,
  TrabajadorAdmin as TrabajadorBackend,
  DocumentoAdmin
} from '../../services/backend/administrador.service';

type EstadoTrabajador =
  | 'Pendiente'
  | 'Verificado'
  | 'Suspendido';

interface TrabajadorAdmin extends Omit<TrabajadorBackend, 'estado'> {
  estado: EstadoTrabajador;
  especialidad: string;
  observacion: string;
  mensaje: string;
}

interface ReporteAdmin {
  id: number;
  asunto: string;
  descripcion: string;
  pedido: number;
  estado: 'Pendiente' | 'Revisado';
}

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css'
})
export class Administracion implements OnInit {

  constructor(
    private administradorService: AdministradorService
  ) {}

  filtroEstado: string = 'Todos';

  trabajadores: TrabajadorAdmin[] = [];

  cargandoTrabajadores = false;
  errorTrabajadores = '';

  // Documentos del trabajador seleccionado
  trabajadorSeleccionadoId: number | null = null;
  documentos: DocumentoAdmin[] = [];
  cargandoDocumentos = false;
  errorDocumentos = '';

  reportes: ReporteAdmin[] = [
    {
      id: 201,
      asunto: 'Dificultad para coordinar una visita',
      descripcion: 'Reporte de ejemplo.',
      pedido: 101,
      estado: 'Pendiente'
    },
    {
      id: 202,
      asunto: 'Desacuerdo sobre una propuesta',
      descripcion: 'Reporte de ejemplo.',
      pedido: 102,
      estado: 'Pendiente'
    }
  ];

  ngOnInit(): void {
    this.cargarTrabajadores();
  }

  cargarTrabajadores(): void {
    this.cargandoTrabajadores = true;
    this.errorTrabajadores = '';

    forkJoin({
      revision: this.administradorService.obtenerTrabajadores('en_revision'),
      activos: this.administradorService.obtenerTrabajadores('activo'),
      suspendidos: this.administradorService.obtenerTrabajadores('suspendido')
    }).subscribe({
      next: (resultado) => {
        const todos = [
          ...resultado.revision,
          ...resultado.activos,
          ...resultado.suspendidos
        ];

        this.trabajadores = todos.map(trabajador => ({
          ...trabajador,
          estado: this.traducirEstado(trabajador.estado),
          especialidad: 'No disponible',
          observacion: '',
          mensaje: ''
        }));

        this.cargandoTrabajadores = false;
      },
      error: (error) => {
        console.error('Error al cargar trabajadores:', error);

        this.errorTrabajadores =
          'No se pudieron cargar los trabajadores. Verifica la conexión con el servidor.';

        this.cargandoTrabajadores = false;
      }
    });
  }

  private traducirEstado(estado: EstadoBackend): EstadoTrabajador {
    switch (estado) {
      case 'en_revision':
        return 'Pendiente';
      case 'activo':
        return 'Verificado';
      case 'suspendido':
        return 'Suspendido';
    }
  }

  // Consultar documentos de un trabajador
  verDocumentos(trabajadorId: number): void {

    if (this.trabajadorSeleccionadoId === trabajadorId) {
      this.trabajadorSeleccionadoId = null;
      this.documentos = [];
      return;
    }

    this.trabajadorSeleccionadoId = trabajadorId;
    this.documentos = [];
    this.errorDocumentos = '';
    this.cargandoDocumentos = true;

    this.administradorService.obtenerDocumentos(trabajadorId).subscribe({
      next: (documentos) => {
        this.documentos = documentos;
        this.cargandoDocumentos = false;
      },
      error: (error) => {
        console.error('Error al consultar documentos:', error);

        this.errorDocumentos =
          'No se pudieron consultar los documentos de este trabajador.';

        this.cargandoDocumentos = false;
      }
    });
  }

  // Abrir archivo de un documento
  abrirDocumento(documentoId: number): void {
    this.administradorService.obtenerArchivoDocumento(documentoId).subscribe({
      next: (archivo) => {
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');

        enlace.href = url;
        enlace.target = '_blank';
        enlace.rel = 'noopener';
        enlace.click();

        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (error) => {
        console.error('Error al abrir documento:', error);
        alert('No se pudo abrir el archivo. Verifica que esté disponible.');
      }
    });
  }

  get totalTrabajadores(): number {
    return this.trabajadores.length;
  }

  get pendientesVerificacion(): number {
    return this.trabajadores.filter(
      trabajador => trabajador.estado === 'Pendiente'
    ).length;
  }

  get reportesPendientes(): number {
    return this.reportes.filter(
      reporte => reporte.estado === 'Pendiente'
    ).length;
  }

  get trabajadoresFiltrados(): TrabajadorAdmin[] {
    if (this.filtroEstado === 'Todos') {
      return this.trabajadores;
    }

    return this.trabajadores.filter(
      trabajador => trabajador.estado === this.filtroEstado
    );
  }

  // Acciones que conectaremos posteriormente
  verificarTrabajador(trabajador: TrabajadorAdmin): void {
    trabajador.mensaje =
      'La aprobación real se realiza revisando sus documentos.';
  }

  rechazarTrabajador(trabajador: TrabajadorAdmin): void {
    trabajador.mensaje =
      'El rechazo real se realiza desde la revisión de documentos.';
  }

  suspenderTrabajador(trabajador: TrabajadorAdmin): void {
    trabajador.mensaje =
      'La suspensión se gestiona mediante la validación de reportes.';
  }

  reactivarTrabajador(trabajador: TrabajadorAdmin): void {
    trabajador.mensaje =
      'La reactivación se realiza automáticamente cuando vence la suspensión.';
  }

  revisarReporte(reporte: ReporteAdmin): void {
    reporte.estado = 'Revisado';
  }
}
