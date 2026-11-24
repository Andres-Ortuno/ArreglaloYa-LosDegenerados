
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
interface Trabajador {
  id: number;
  nombre: string;
  especialidad: string;
  zona: string;
}

@Component({
  selector: 'app-buscar',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './buscar.html',
  styleUrl: './buscar.css'
})
export class Buscar {

  busqueda: string = '';

  trabajadores: Trabajador[] = [
    {
      id: 1,
      nombre: 'Perfil de ejemplo 1',
      especialidad: 'Albañilería',
      zona: 'Cercado'
    },
    {
      id: 2,
      nombre: 'Perfil de ejemplo 2',
      especialidad: 'Electrodomésticos',
      zona: 'Sacaba'
    },
    {
      id: 3,
      nombre: 'Perfil de ejemplo 3',
      especialidad: 'Albañilería',
      zona: 'Quillacollo'
    }
  ];

  get trabajadoresFiltrados(): Trabajador[] {
    const texto = this.busqueda.toLowerCase().trim();

    return this.trabajadores.filter(trabajador =>
      trabajador.nombre.toLowerCase().includes(texto) ||
      trabajador.especialidad.toLowerCase().includes(texto) ||
      trabajador.zona.toLowerCase().includes(texto)
    );
  }
}
