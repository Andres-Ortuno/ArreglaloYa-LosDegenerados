import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ingresar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './ingresar.html',
  styleUrl: './ingresar.css'
})
export class Ingresar {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  correo: string = '';
  contrasena: string = '';

  mensaje: string = '';
  formularioValido: boolean = false;
  enviando: boolean = false;

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

    // Inicio de sesión real contra el backend
    this.enviando = true;
    this.auth.ingresar(correo, this.contrasena).subscribe({
      next: () => {
        this.enviando = false;
        this.formularioValido = true;
        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.enviando = false;
        this.mensaje = this.mensajeDeError(error);
      }
    });
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor. Comprueba que el backend esté encendido.';
      }
      const m = (error.error as { message?: string | string[] } | null)?.message;
      if (m) return Array.isArray(m) ? m.join(' ') : m;
    }
    return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
  }
}
