
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {

  nombre: string = '';
  correo: string = '';
  contrasena: string = '';
  confirmarContrasena: string = '';

  tipoUsuario: string = '';
  especialidad: string = '';
  zona: string = '';

  mensaje: string = '';
  registroValido: boolean = false;

  registrar(formulario: NgForm): void {

    this.mensaje = '';
    this.registroValido = false;

    // Eliminar espacios innecesarios
    const nombre = this.nombre.trim();
    const correo = this.correo.trim();
    const zona = this.zona.trim();

    // Validar formato del correo
    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    // COMPROBAR CAMPOS OBLIGATORIOS
    if (
      formulario.invalid ||
      nombre.length < 3 ||
      !correoValido ||
      this.contrasena.length < 8 ||
      !this.tipoUsuario
    ) {
      formulario.control.markAllAsTouched();

      this.mensaje =
        'Revisa los datos obligatorios. ' +
        'El nombre debe tener al menos 3 caracteres, ' +
        'el correo debe ser válido y la contraseña ' +
        'debe tener al menos 8 caracteres.';

      return;
    }

    // COMPROBAR QUE LAS CONTRASEÑAS COINCIDAN
    if (this.contrasena !== this.confirmarContrasena) {

      this.mensaje =
        'Las contraseñas no coinciden.';

      return;
    }

    // VALIDACIONES ESPECIALES PARA TRABAJADORES
    if (this.tipoUsuario === 'trabajador') {

      if (
        !this.especialidad ||
        zona.length < 3
      ) {
        this.mensaje =
          'Si te registras como trabajador, ' +
          'debes seleccionar una especialidad ' +
          'e indicar tu zona de trabajo.';

        return;
      }
    }

    // EL FORMULARIO ES VÁLIDO
    this.registroValido = true;

    this.mensaje =
      'Formulario validado correctamente. ' +
      'Este registro es una demostración: ' +
      'todavía no se ha creado una cuenta real.';
  }
}
