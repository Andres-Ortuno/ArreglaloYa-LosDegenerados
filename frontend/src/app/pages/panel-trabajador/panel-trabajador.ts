
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SolicitudesService } from '../../services/solicitudes.services';
import type { Pedido } from '../../services/solicitudes.services';
import { PerfilTrabajadorService } from '../../services/perfil-trabajador.services';
// DATOS DEL PERFIL
interface Perfil {
  nombre: string;
  especialidad: string;
  zona: string;
  descripcion: string;
  disponibilidad: string;
}

// DATOS DE LAS PROPUESTAS
interface Propuesta {
  id: number;
  solicitud: string;
  monto: number;
  detalle: string;
}

@Component({
  selector: 'app-panel-trabajador',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './panel-trabajador.html',
  styleUrl: './panel-trabajador.css'
})
export class PanelTrabajador {

  // SERVICIO COMPARTIDO DE SOLICITUDES
  private readonly solicitudesService =
    inject(SolicitudesService);

  // DATOS DEL PERFIL
private readonly perfilService =
  inject(PerfilTrabajadorService);

// Obtener una copia de los datos compartidos
perfil: Perfil = {
  ...this.perfilService.perfil()
};


  perfilGuardado: Perfil | null = { ...this.perfil };
  mensajePerfil: string = '';

  // DOCUMENTO DE DEMOSTRACIÓN
  nombreDocumento: string = '';

  // SOLICITUDES COMPARTIDAS
  // Obtenemos los pedidos pendientes del servicio
  get solicitudes(): Pedido[] {

    return this.solicitudesService.pedidos().filter(
      pedido => pedido.estado === 'Pendiente'
    );
  }

  // PROPUESTAS DE DEMOSTRACIÓN
  solicitudSeleccionadaId: number | null = null;
  monto: number | null = null;
  detallePropuesta: string = '';

  propuestas: Propuesta[] = [];
  mensajePropuesta: string = '';

guardarPerfil(formulario: NgForm): void {

  this.mensajePerfil = '';

  if (
    formulario.invalid ||
    !this.perfil.nombre.trim() ||
    !this.perfil.zona.trim() ||
    !this.perfil.descripcion.trim()
  ) {
    formulario.form.markAllAsTouched();

    this.mensajePerfil =
      'Revisa los campos obligatorios.';

    return;
  }

  // Limpiar espacios innecesarios
  this.perfil = {
    nombre: this.perfil.nombre.trim(),
    especialidad: this.perfil.especialidad,
    zona: this.perfil.zona.trim(),
    descripcion: this.perfil.descripcion.trim(),
    disponibilidad: this.perfil.disponibilidad
  };

  // Compartir los cambios con las otras páginas
  this.perfilService.guardarPerfil(this.perfil);

  // Actualizar la vista previa
  this.perfilGuardado = { ...this.perfil };

  this.mensajePerfil =
    'Perfil actualizado en esta demostración.';
}


  // RECONOCER UN ARCHIVO SELECCIONADO
  seleccionarDocumento(evento: Event): void {

    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    this.nombreDocumento = archivo
      ? archivo.name
      : '';
  }

  // ELEGIR UNA SOLICITUD DISPONIBLE
  seleccionarSolicitud(id: number): void {

    this.solicitudSeleccionadaId = id;
    this.mensajePropuesta = '';
  }

  // PREPARAR UNA PROPUESTA DE PRUEBA
  prepararPropuesta(formulario: NgForm): void {

    this.mensajePropuesta = '';

    // Buscamos la solicitud seleccionada
    // dentro de la lista compartida
    const solicitud = this.solicitudes.find(
      item => item.id === this.solicitudSeleccionadaId
    );

    // Comprobar que seleccionó una solicitud
    if (!solicitud) {

      this.mensajePropuesta =
        'Primero selecciona una solicitud disponible.';

      return;
    }

    // Validar el formulario
    if (
      formulario.invalid ||
      this.monto === null ||
      !Number.isFinite(this.monto) ||
      this.monto <= 0 ||
      !this.detallePropuesta.trim()
    ) {

      formulario.form.markAllAsTouched();

      this.mensajePropuesta =
        'Revisa el monto y la descripción de tu propuesta.';

      return;
    }

    // Crear una propuesta de demostración
    const propuesta: Propuesta = {
      id: this.propuestas.length + 1,
      solicitud: solicitud.titulo,
      monto: this.monto,
      detalle: this.detallePropuesta.trim()
    };

    // Agregar la propuesta a la lista local
    this.propuestas.push(propuesta);

this.solicitudesService.actualizarPedido(
  solicitud.id,
  {
    propuesta: {
      monto: propuesta.monto,
      detalle: propuesta.detalle,
      trabajador: this.perfil.nombre
    },
    monto: propuesta.monto,
    trabajador: this.perfil.nombre
  }
);

    this.mensajePropuesta =
      'Propuesta preparada. No se ha enviado a ningún cliente.';

    // Limpiar los campos
    this.solicitudSeleccionadaId = null;
    this.monto = null;
    this.detallePropuesta = '';

    formulario.resetForm();
  }
}
