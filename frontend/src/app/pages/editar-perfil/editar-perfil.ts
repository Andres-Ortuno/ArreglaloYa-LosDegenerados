
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { PerfilTrabajadorService } from
  '../../services/perfil-trabajador.services';

import type { PerfilProfesional } from
  '../../services/perfil-trabajador.services';

@Component({
  selector: 'app-editar-perfil',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css'
})
export class EditarPerfil {

  // SERVICIO COMPARTIDO CON EL PANEL Y PERFIL PÚBLICO
  private readonly perfilService =
    inject(PerfilTrabajadorService);

  // COPIA EDITABLE DE LOS DATOS ACTUALES
  perfil: PerfilProfesional = {
    ...this.perfilService.perfil()
  };

  mensaje: string = '';
  perfilActualizado: boolean = false;

  // VALIDAR Y GUARDAR LOS CAMBIOS
  guardarCambios(formulario: NgForm): void {

    this.mensaje = '';
    this.perfilActualizado = false;

    // Eliminar espacios innecesarios
    const nombre = this.perfil.nombre.trim();
    const zona = this.perfil.zona.trim();
    const descripcion = this.perfil.descripcion.trim();

    // Validar las opciones disponibles
    const especialidadesValidas = [
      'Albañilería',
      'Electrodomésticos'
    ];

    const disponibilidadesValidas = [
      'Mañanas',
      'Tardes',
      'Fines de semana',
      'A coordinar'
    ];

    // COMPROBAR TODOS LOS CAMPOS
    if (
      formulario.invalid ||
      nombre.length < 3 ||
      zona.length < 3 ||
      descripcion.length < 15 ||
      !especialidadesValidas.includes(this.perfil.especialidad) ||
      !disponibilidadesValidas.includes(this.perfil.disponibilidad)
    ) {

      formulario.form.markAllAsTouched();

      this.mensaje =
        'No se pudo actualizar el perfil. ' +
        'Comprueba el nombre (mínimo 3 caracteres), ' +
        'la zona (mínimo 3 caracteres), ' +
        'la descripción (mínimo 15 caracteres), ' +
        'la especialidad y la disponibilidad.';

      return;
    }

    // Preparar los datos válidos
    const perfilValidado: PerfilProfesional = {
      nombre,
      especialidad: this.perfil.especialidad,
      zona,
      descripcion,
      disponibilidad: this.perfil.disponibilidad
    };

    // GUARDAR EN EL SERVICIO COMPARTIDO
    this.perfilService.guardarPerfil(perfilValidado);

    // Actualizar la copia del formulario
    this.perfil = { ...perfilValidado };

    this.perfilActualizado = true;

    this.mensaje =
      'Perfil actualizado correctamente. ' +
      'Los cambios ya están disponibles ' +
      'en el Panel del trabajador y en el Perfil público ' +
      'de demostración.';
  }
}
