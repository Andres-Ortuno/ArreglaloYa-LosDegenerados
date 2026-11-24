
import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ingresar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css'
})
export class Ingresar {

  correo: string = '';
  contrasena: string = '';

  mensaje: string = '';
  formularioValido: boolean = false;

  ingresar(formulario: NgForm): void {

    // Limpiar mensajes anteriores
    this.mensaje = '';
    this.formularioValido = false;

    // Eliminar espacios del correo
    const correo = this.correo.trim();

    // Comprobar formato del correo
    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    // Validar los datos
    if (
      formulario.invalid ||
      !correoValido ||
      this.contrasena.length < 8
    ) {
      formulario.control.markAllAsTouched();

      this.mensaje =
        'Revisa tu correo electrónico y contraseña. ' +
        'La contraseña debe tener al menos 8 caracteres.';

      return;
    }

    // Formulario válido (demostración)
    this.formularioValido = true;

    this.mensaje =
      'Formulario validado correctamente. ' +
      'El inicio de sesión real estará disponible ' +
      'cuando conectemos NestJS.';
  }
}
