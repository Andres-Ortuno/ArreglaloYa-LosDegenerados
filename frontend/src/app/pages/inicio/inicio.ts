
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  SesionDemoService,
  type RolDemo
} from '../../services/sesion-demo.service';

import {
  SolicitudesApiService
} from '../../services/api/solicitudes-api.service';

import {
  PerfilApiService
} from '../../services/api/perfil-api.service';

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

  // SIMULACIÓN DE ROLES
  private readonly sesionDemo =
    inject(SesionDemoService);

  readonly rolActual = this.sesionDemo.rolActual;

  cambiarRol(rol: RolDemo): void {
    this.sesionDemo.cambiarRol(rol);
  }

  // SERVICIOS HTTP
  readonly pedidosApi = inject(SolicitudesApiService);

  readonly perfilesApi = inject(PerfilApiService);

  // PROBAR API DE PEDIDOS
  probarPedidos(): void {

    this.pedidosApi.obtenerPedidos().subscribe({
      next: () => {
        // El estado de éxito se gestiona en el servicio.
      },
      error: () => {
        // El estado de error se gestiona en el servicio.
      }
    });

  }

  // PROBAR API DE PERFILES
  probarPerfiles(): void {

    this.perfilesApi.obtenerPerfiles().subscribe({
      next: () => {
        // El estado de éxito se gestiona en el servicio.
      },
      error: () => {
        // El estado de error se gestiona en el servicio.
      }
    });

  }
}
