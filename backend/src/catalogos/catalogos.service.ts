import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Especialidad } from './especialidad.entity.js';
import { Zona } from './zona.entity.js';

/** Las zonas y especialidades iniciales las carga el script SQL (sección 10), no el backend. */
@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(Zona) private readonly zonas: Repository<Zona>,
    @InjectRepository(Especialidad) private readonly especialidades: Repository<Especialidad>,
  ) {}

  listarZonas() {
    return this.zonas.find({ order: { nombre: 'ASC' } });
  }

  listarEspecialidades() {
    return this.especialidades.find({ order: { nombre: 'ASC' } });
  }

  buscarZona(id: number) {
    return this.zonas.findOne({ where: { id } });
  }

  buscarZonaPorNombre(nombre: string) {
    return this.zonas.findOne({ where: { nombre } });
  }

  buscarEspecialidadPorNombre(nombre: string) {
    return this.especialidades.findOne({ where: { nombre } });
  }
}
