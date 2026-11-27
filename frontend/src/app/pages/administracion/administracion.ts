import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';

import type { EstadoTrabajador } from '../../models/backend.models';
import {
  ApiAdmin,
  type DocumentoAdmin,
  type EstadoReporte,
  type FlujoEconomico,
  type ReporteAdmin,
  type TrabajadorAdmin
} from '../../services/backend/api-admin';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css'
})
export class Administracion implements OnInit {

  private readonly api = inject(ApiAdmin);

  // Trabajadores
  filtroEstado: EstadoTrabajador = 'en_revision';
  trabajadores: TrabajadorAdmin[] = [];
  trabajadorAbierto: number | null = null;
  documentos: DocumentoAdmin[] = [];
  motivoDocumento: Record<number, string> = {};

  // Reportes
  filtroReporte: EstadoReporte = 'pendiente';
  reportes: ReporteAdmin[] = [];
  motivoReporte: Record<number, string> = {};
  denuncia: Record<number, string> = {};

  // Flujo económico
  desde: string = '';
  hasta: string = '';
  flujo: FlujoEconomico | null = null;

  mensaje: string = '';
  esError: boolean = false;
  ocupado: boolean = false;

  ngOnInit(): void {
    this.cargarTrabajadores();
    this.cargarReportes();
    this.cargarFlujo();
  }

  // ------------------------------------------------------------ trabajadores
  cargarTrabajadores(): void {
    this.api.trabajadores(this.filtroEstado).subscribe({
      next: (lista) => {
        this.trabajadores = lista;
        if (!lista.some((t) => t.id === this.trabajadorAbierto)) {
          this.trabajadorAbierto = null;
          this.documentos = [];
        }
      },
      error: (e) => this.avisar(mensajeDeError(e), true)
    });
  }

  alCambiarFiltroTrabajadores(): void {
    this.trabajadorAbierto = null;
    this.documentos = [];
    this.cargarTrabajadores();
  }

  textoEstado(estado: EstadoTrabajador): string {
    switch (estado) {
      case 'en_revision': return 'En revisión';
      case 'activo': return 'Activo';
      case 'suspendido': return 'Suspendido';
    }
  }

  verDocumentos(t: TrabajadorAdmin): void {
    if (this.trabajadorAbierto === t.id) {
      this.trabajadorAbierto = null;
      this.documentos = [];
      return;
    }
    this.trabajadorAbierto = t.id;
    this.cargarDocumentos(t.id);
  }

  private cargarDocumentos(trabajadorId: number): void {
    this.api.documentosDe(trabajadorId).subscribe({
      next: (lista) => (this.documentos = lista),
      error: (e) => this.avisar(mensajeDeError(e), true)
    });
  }

  abrirArchivo(d: DocumentoAdmin): void {
    this.api.archivo(d.id).subscribe({
      next: (blob) => {
        const direccion = URL.createObjectURL(blob);
        window.open(direccion, '_blank');
        setTimeout(() => URL.revokeObjectURL(direccion), 60000);
      },
      error: (e) => this.avisar(mensajeDeError(e, 'No se pudo abrir el archivo.'), true)
    });
  }

  aprobarDocumento(d: DocumentoAdmin): void {
    const trabajadorId = this.trabajadorAbierto;
    this.ejecutar(this.api.aprobarDocumento(d.id), (r) => {
      const res = r as { cuentaActivada: boolean };
      this.avisar(
        res.cuentaActivada
          ? 'Documento aprobado. Con los tres documentos aprobados, la cuenta quedó activa.'
          : 'Documento aprobado.',
        false
      );
      if (trabajadorId !== null) this.cargarDocumentos(trabajadorId);
      this.cargarTrabajadores();
    });
  }

  rechazarDocumento(d: DocumentoAdmin): void {
    const motivo = (this.motivoDocumento[d.id] ?? '').trim();
    if (motivo.length < 5 || motivo.length > 300) {
      this.avisar('Escribe una corrección de entre 5 y 300 caracteres.', true);
      return;
    }
    const trabajadorId = this.trabajadorAbierto;
    this.ejecutar(this.api.rechazarDocumento(d.id, motivo), () => {
      this.avisar('Documento observado. Se notificó al trabajador para que lo corrija.', false);
      delete this.motivoDocumento[d.id];
      if (trabajadorId !== null) this.cargarDocumentos(trabajadorId);
      this.cargarTrabajadores();
    });
  }

  // ------------------------------------------------------------ reportes
  cargarReportes(): void {
    this.api.reportes(this.filtroReporte).subscribe({
      next: (lista) => (this.reportes = lista),
      error: (e) => this.avisar(mensajeDeError(e), true)
    });
  }

  textoTipo(tipo: string): string {
    switch (tipo) {
      case 'incumplimiento': return 'Incumplimiento';
      case 'estafa': return 'Estafa';
      case 'robo': return 'Robo';
      default: return tipo;
    }
  }

  validarReporte(r: ReporteAdmin): void {
    const denuncia = (this.denuncia[r.id] ?? '').trim();
    if (r.tipo === 'robo' && !denuncia) {
      this.avisar('Un reporte por robo exige los datos de la denuncia policial.', true);
      return;
    }
    this.ejecutar(this.api.validarReporte(r.id, denuncia || undefined), () => {
      this.avisar('Reporte válido. La sanción ya se aplicó al trabajador.', false);
      this.cargarReportes();
      this.cargarTrabajadores();
    });
  }

  rechazarReporte(r: ReporteAdmin): void {
    const motivo = (this.motivoReporte[r.id] ?? '').trim();
    this.ejecutar(this.api.rechazarReporte(r.id, motivo || undefined), () => {
      this.avisar('Reporte rechazado. Se avisó al cliente.', false);
      this.cargarReportes();
    });
  }

  // ------------------------------------------------------------ flujo económico
  cargarFlujo(): void {
    this.api.flujoEconomico(this.desde || undefined, this.hasta || undefined).subscribe({
      next: (f) => (this.flujo = f),
      error: (e) => this.avisar(mensajeDeError(e), true)
    });
  }

  // ------------------------------------------------------------ apoyo
  private ejecutar(accion$: Observable<unknown>, alTerminar: (respuesta: unknown) => void): void {
    this.ocupado = true;
    accion$.subscribe({
      next: (r) => {
        this.ocupado = false;
        alTerminar(r);
      },
      error: (e) => {
        this.ocupado = false;
        this.avisar(mensajeDeError(e), true);
      }
    });
  }

  private avisar(texto: string, error: boolean): void {
    this.mensaje = texto;
    this.esError = error;
  }
}
