import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SesionDemoService,
  type RolDemo
} from '../../services/sesion-demo.service';

import { SolicitudesApiService } from
  '../../services/api/solicitudes-api.service';

import { PerfilApiService } from
  '../../services/api/perfil-api.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
<<<<<<< HEAD
  titulo: string = 'ArreglaloYa';
=======
  nombreProyecto: string = 'ArreglaloYa';
  descripcion: string = 'Encuentra trabajadores para tus necesidades';

  private readonly sesionDemo = inject(SesionDemoService);

  readonly rolActual = this.sesionDemo.rolActual;

  cambiarRol(rol: RolDemo): void {
    this.sesionDemo.cambiarRol(rol);
  }

// Servicios para comprobar las peticiones HTTP
readonly pedidosApi = inject(SolicitudesApiService);
readonly perfilesApi = inject(PerfilApiService);

// PROBAR LA CONSULTA DE PEDIDOS
probarPedidos(): void {

  this.pedidosApi.obtenerPedidos().subscribe({
    next: () => {
      // El mensaje de éxito se guarda en estado.exito
    },
    error: () => {
      // El mensaje de error se guarda en estado.error
    }
  });
}

// PROBAR LA CONSULTA DE PERFILES
probarPerfiles(): void {

  this.perfilesApi.obtenerPerfiles().subscribe({
    next: () => {
      // El mensaje de éxito se guarda en estado.exito
    },
    error: () => {
      // El mensaje de error se guarda en estado.error
    }
  });
}

>>>>>>> 83b566d (preparar servicio http y pruebas del frontend)
}
