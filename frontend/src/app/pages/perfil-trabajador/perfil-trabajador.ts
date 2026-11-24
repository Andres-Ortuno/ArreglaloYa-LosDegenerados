
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PerfilTrabajadorService } from '../../services/perfil-trabajador.services';
// Estructura de los datos de un trabajador
interface Trabajador {
  id: number;
  nombre: string;
  iniciales: string;
  especialidad: string;
  zona: string;
  descripcion: string;
  calificacion: string;
  servicios: string[];
  disponibilidad?: string;
}

@Component({
  selector: 'app-perfil-trabajador',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './perfil-trabajador.html',
  styleUrl: './perfil-trabajador.css'
})
export class PerfilTrabajador {

  private readonly ruta = inject(ActivatedRoute);
private readonly perfilService =
  inject(PerfilTrabajadorService);
  // Datos ficticios para practicar con Angular
  trabajadores: Trabajador[] = [
    {
      id: 1,
      nombre: 'Perfil de ejemplo 1',
      iniciales: 'PE',
      especialidad: 'Albañilería',
      zona: 'Cercado',
      descripcion:
        'Perfil demostrativo de un profesional dedicado a reparaciones y arreglos generales del hogar.',
      calificacion: '4.8 / 5 (ejemplo)',
      servicios: [
        'Reparación de paredes',
        'Arreglos de muros',
        'Trabajos generales de albañilería'
      ]
    },
    {
      id: 2,
      nombre: 'Perfil de ejemplo 2',
      iniciales: 'PE',
      especialidad: 'Electrodomésticos',
      zona: 'Sacaba',
      descripcion:
        'Perfil demostrativo de un técnico especializado en revisión y reparación de electrodomésticos.',
      calificacion: '4.6 / 5 (ejemplo)',
      servicios: [
        'Revisión de lavadoras',
        'Reparación de cocinas',
        'Diagnóstico de electrodomésticos'
      ]
    },
    {
      id: 3,
      nombre: 'Perfil de ejemplo 3',
      iniciales: 'PE',
      especialidad: 'Albañilería',
      zona: 'Quillacollo',
      descripcion:
        'Perfil demostrativo para mostrar servicios de mantenimiento y reparación de viviendas.',
      calificacion: '4.7 / 5 (ejemplo)',
      servicios: [
        'Reparaciones del hogar',
        'Mantenimiento de paredes',
        'Arreglos de albañilería'
      ]
    }
  ];

  // Obtiene el trabajador según el ID de la URL
  
get trabajador(): Trabajador | undefined {

  // Leer el ID desde la URL
  const id = Number(
    this.ruta.snapshot.paramMap.get('id')
  );

  // Buscar el perfil en nuestra lista
  const trabajadorOriginal = this.trabajadores.find(
    trabajador => trabajador.id === id
  );

  if (!trabajadorOriginal) {
    return undefined;
  }

  // Los otros perfiles siguen siendo ejemplos independientes
  if (id !== 1) {
    return trabajadorOriginal;
  }

  // El perfil 1 usará los datos compartidos
  const perfil = this.perfilService.perfil();

  // Obtener las iniciales del nombre
  const iniciales = perfil.nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('') || 'PE';

  // Servicios según la especialidad elegida
  const servicios =
    perfil.especialidad === 'Electrodomésticos'
      ? [
          'Revisión de lavadoras',
          'Reparación de cocinas',
          'Diagnóstico de electrodomésticos'
        ]
      : [
          'Reparación de paredes',
          'Arreglos de muros',
          'Trabajos generales de albañilería'
        ];

  return {
    ...trabajadorOriginal,
    nombre: perfil.nombre,
    iniciales,
    especialidad: perfil.especialidad,
    zona: perfil.zona,
    descripcion: perfil.descripcion,
    disponibilidad: perfil.disponibilidad,
    servicios
  };
}

}
