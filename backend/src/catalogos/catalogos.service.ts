import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Especialidad } from './especialidad.entity.js';
import { Zona } from './zona.entity.js';

// Datos iniciales de la V1 (los mismos que usan las maquetas)
const ZONAS = ['Cercado', 'Sacaba', 'Tiquipaya', 'Quillacollo', 'Colcapirhua'];
const ESPECIALIDADES = ['Albañilería', 'Reparación de electrodomésticos'];

@Injectable()
export class CatalogosService implements OnModuleInit {
  constructor(
    @InjectRepository(Zona) private readonly zonas: Repository<Zona>,
    @InjectRepository(Especialidad) private readonly especialidades: Repository<Especialidad>,
  ) {}

  onModuleInit() {
    return this.sembrar();
  }

  /** Crea las zonas y especialidades iniciales si las tablas están vacías. */
  async sembrar() {
    if ((await this.zonas.count()) === 0) {
      await this.zonas.save(ZONAS.map((nombre) => this.zonas.create({ nombre })));
    }
    if ((await this.especialidades.count()) === 0) {
      await this.especialidades.save(
        ESPECIALIDADES.map((nombre) => this.especialidades.create({ nombre })),
      );
    }
  }

  listarZonas() {
    return this.zonas.find({ order: { nombre: 'ASC' } });
  }

  listarEspecialidades() {
    return this.especialidades.find({ order: { nombre: 'ASC' } });
  }

  buscarZona(id: number) {
    return this.zonas.findOne({ where: { id } });
  }

  buscarEspecialidad(id: number) {
    return this.especialidades.findOne({ where: { id } });
  }

  buscarEspecialidadPorNombre(nombre: string) {
    return this.especialidades.findOne({ where: { nombre } });
  }

  buscarZonaPorNombre(nombre: string) {
    return this.zonas.findOne({ where: { nombre } });
  }
}
