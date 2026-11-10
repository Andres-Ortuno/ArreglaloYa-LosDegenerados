import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service.js';

@ApiTags('Catálogos')
@Controller()
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  /** Lista de zonas para los formularios (solicitar, buscar, perfil). */
  @Get('zonas')
  zonas() {
    return this.catalogos.listarZonas();
  }

  /** Lista de especialidades para los formularios. */
  @Get('especialidades')
  especialidades() {
    return this.catalogos.listarEspecialidades();
  }
}
