
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SolicitudesService } from
  '../../services/solicitudes.services';

@Component({
  selector: 'app-solicitar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './solicitar.html',
  styleUrl: './solicitar.css'
})
export class Solicitar {

  private readonly solicitudesService =
    inject(SolicitudesService);

  especialidad: string = '';
  titulo: string = '';
  descripcion: string = '';
  zona: string = '';
  horario: string = '';

  nombreArchivo: string = '';
  mensaje: string = '';

  resumen: {
    titulo: string;
    especialidad: string;
    zona: string;
    horario: string;
  } | null = null;

  seleccionarArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];

    this.nombreArchivo = archivo ? archivo.name : '';
  }


enviarSolicitud(formulario: NgForm): void {

  // Limpiar mensajes anteriores
  this.mensaje = '';
  this.resumen = null;

  // Eliminar espacios al inicio y al final
  const titulo = this.titulo.trim();
  const descripcion = this.descripcion.trim();
  const zona = this.zona.trim();

  // Validar campos obligatorios y longitudes
  if (
    formulario.invalid ||
    !this.especialidad ||
    !this.horario ||
    titulo.length < 5 ||
    descripcion.length < 15 ||
    zona.length < 3
  ) {
    formulario.control.markAllAsTouched();

    this.mensaje =
      'No se pudo crear la solicitud. ' +
      'Revisa los campos obligatorios: ' +
      'título (mínimo 5 caracteres), ' +
      'descripción (mínimo 15 caracteres) ' +
      'y zona (mínimo 3 caracteres).';

    return;
  }

  // Crear solicitud en el servicio compartido
  this.solicitudesService.crearSolicitud({
    titulo: titulo,
    especialidad: this.especialidad,
    descripcion: descripcion,
    zona: zona,
    horario: this.horario
  });

  // Mostrar resumen de la solicitud
  this.resumen = {
    titulo: titulo,
    especialidad: this.especialidad,
    zona: zona,
    horario: this.horario
  };

  // Confirmar la operación de prueba
  this.mensaje =
    'Solicitud creada correctamente en la demostración. ' +
    'Puedes verla en Mis pedidos.';
}

}
