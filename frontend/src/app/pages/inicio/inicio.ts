import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {

  titulo: string = 'ArreglaloYa';

  nombreProyecto: string = 'ArreglaloYa';

  descripcion: string =
    'Encuentra trabajadores para tus necesidades';

  // SESIÓN REAL
  readonly auth = inject(AuthService);

  readonly rolActual = this.auth.rolActual;
  readonly rolesDisponibles = this.auth.rolesDisponibles;
  readonly cuenta = this.auth.cuenta;

  cambiarRol(rol: 'visitante' | 'cliente' | 'trabajador' | 'administrador'): void {
    this.auth.cambiarRol(rol);
  }

  salir(): void {
    this.auth.salir();
  }
}
