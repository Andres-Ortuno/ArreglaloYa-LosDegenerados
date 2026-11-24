
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Estados posibles de un trabajador
type EstadoTrabajador =
  | 'Pendiente'
  | 'Verificado'
  | 'Rechazado'
  | 'Suspendido';

// Datos necesarios para administrar trabajadores
interface TrabajadorAdmin {
  id: number;
  nombre: string;
  especialidad: string;
  zona: string;
  estado: EstadoTrabajador;
  observacion: string;
  mensaje: string;
}

// Datos de un reporte
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
  imports: [FormsModule, RouterLink],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css'
})
export class Administracion {

  filtroEstado: string = 'Todos';

  // TRABAJADORES FICTICIOS
  trabajadores: TrabajadorAdmin[] = [
    {
      id: 1,
      nombre: 'Trabajador de ejemplo 1',
      especialidad: 'Albañilería',
      zona: 'Cercado',
      estado: 'Pendiente',
      observacion: '',
      mensaje: ''
    },
    {
      id: 2,
      nombre: 'Trabajador de ejemplo 2',
      especialidad: 'Electrodomésticos',
      zona: 'Sacaba',
      estado: 'Pendiente',
      observacion: '',
      mensaje: ''
    },
    {
      id: 3,
      nombre: 'Trabajador de ejemplo 3',
      especialidad: 'Albañilería',
      zona: 'Quillacollo',
      estado: 'Verificado',
      observacion: '',
      mensaje: ''
    }
  ];

  // REPORTES FICTICIOS
  reportes: ReporteAdmin[] = [
    {
      id: 201,
      asunto: 'Dificultad para coordinar una visita',
      descripcion: 'Reporte de ejemplo sobre la coordinación de un trabajo.',
      pedido: 101,
      estado: 'Pendiente'
    },
    {
      id: 202,
      asunto: 'Desacuerdo sobre una propuesta',
      descripcion: 'Reporte de ejemplo relacionado con el monto propuesto.',
      pedido: 102,
      estado: 'Pendiente'
    }
  ];

  // ESTADÍSTICAS
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

  // FILTRAR TRABAJADORES
  get trabajadoresFiltrados(): TrabajadorAdmin[] {

    if (this.filtroEstado === 'Todos') {
      return this.trabajadores;
    }

    return this.trabajadores.filter(
      trabajador => trabajador.estado === this.filtroEstado
    );
  }

  // APROBAR PERFIL DE PRUEBA
  verificarTrabajador(trabajador: TrabajadorAdmin): void {

    if (trabajador.estado !== 'Pendiente') {
      return;
    }

    trabajador.estado = 'Verificado';

    trabajador.mensaje =
      'Perfil marcado como verificado solo en esta demostración.';
  }

  // RECHAZAR PERFIL DE PRUEBA
  rechazarTrabajador(trabajador: TrabajadorAdmin): void {

    if (trabajador.estado !== 'Pendiente') {
      return;
    }

    if (trabajador.observacion.trim().length < 10) {
      trabajador.mensaje =
        'Escribe una observación de al menos 10 caracteres.';
      return;
    }

    trabajador.estado = 'Rechazado';

    trabajador.mensaje =
      'Solicitud rechazada solo en esta demostración.';
  }

  // SUSPENDER PERFIL DE PRUEBA
  suspenderTrabajador(trabajador: TrabajadorAdmin): void {

    if (trabajador.estado !== 'Verificado') {
      return;
    }

    if (trabajador.observacion.trim().length < 10) {
      trabajador.mensaje =
        'Explica el motivo de prueba con al menos 10 caracteres.';
      return;
    }

    trabajador.estado = 'Suspendido';

    trabajador.mensaje =
      'Suspensión simulada. No afecta a ningún usuario real.';
  }

  // REACTIVAR PERFIL DE PRUEBA
  reactivarTrabajador(trabajador: TrabajadorAdmin): void {

    if (trabajador.estado !== 'Suspendido') {
      return;
    }

    trabajador.estado = 'Verificado';

    trabajador.mensaje =
      'Perfil reactivado solo en esta demostración.';
  }

  // REVISAR UN REPORTE
  revisarReporte(reporte: ReporteAdmin): void {

    if (reporte.estado === 'Revisado') {
      return;
    }

    reporte.estado = 'Revisado';
  }
}
