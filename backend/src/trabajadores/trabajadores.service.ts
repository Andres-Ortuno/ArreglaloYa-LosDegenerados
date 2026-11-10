import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';
import { CatalogosService } from '../catalogos/catalogos.service.js';
import { CuentasService } from '../cuentas/cuentas.service.js';
import { BuscarTrabajadoresDto } from './dto/buscar-trabajadores.dto.js';
import { PerfilTrabajadorDto } from './dto/perfil-trabajador.dto.js';
import { EstadoTrabajador, PerfilTrabajador } from './perfil-trabajador.entity.js';

/** Lo que ven los clientes: solo zona, nunca domicilio ni documentos (RN-11, RNF-03). */
function perfilPublico(perfil: PerfilTrabajador) {
  return {
    id: perfil.id,
    nombre: `${perfil.cuenta.nombres} ${perfil.cuenta.apellidos}`,
    especialidad: perfil.especialidad.nombre,
    zona: perfil.zona.nombre,
    serviciosAdicionales: perfil.serviciosAdicionales,
    aniosExperiencia: perfil.aniosExperiencia,
    descripcion: perfil.descripcion,
    calificacionPromedio: perfil.calificacionPromedio,
    cantidadOpiniones: perfil.cantidadOpiniones,
  };
}

@Injectable()
export class TrabajadoresService {
  constructor(
    @InjectRepository(PerfilTrabajador) private readonly perfiles: Repository<PerfilTrabajador>,
    private readonly cuentas: CuentasService,
    private readonly catalogos: CatalogosService,
  ) {}

  /** RF-07: busca trabajadores Activos por zona y especialidad. */
  async buscar(filtros: BuscarTrabajadoresDto) {
    const where: FindOptionsWhere<PerfilTrabajador> = { estado: EstadoTrabajador.ACTIVO };
    if (filtros.zonaId) where.zona = { id: filtros.zonaId };
    if (filtros.especialidadId) where.especialidad = { id: filtros.especialidadId };
    const encontrados = await this.perfiles.find({
      where,
      order: { calificacionPromedio: 'DESC', cantidadOpiniones: 'DESC' },
    });
    return encontrados.map(perfilPublico);
  }

  async obtenerPublico(id: string) {
    const perfil = await this.perfiles.findOne({ where: { id, estado: EstadoTrabajador.ACTIVO } });
    if (!perfil) throw new NotFoundException('El trabajador no existe o no está activo');
    return perfilPublico(perfil);
  }

  /** RF-02: el trabajador crea o actualiza su perfil. */
  async guardarMiPerfil(cuentaId: string, dto: PerfilTrabajadorDto) {
    const cuenta = await this.cuentas.obtener(cuentaId);
    if (!cuenta.esTrabajador) {
      throw new ForbiddenException('Tu cuenta no tiene el rol de trabajador');
    }
    const especialidad = await this.catalogos.buscarEspecialidad(dto.especialidadId);
    if (!especialidad) throw new BadRequestException('La especialidad no existe');
    const zona = await this.catalogos.buscarZona(dto.zonaId);
    if (!zona) throw new BadRequestException('La zona no existe');

    let perfil = await this.perfiles.findOne({ where: { cuenta: { id: cuentaId } } });
    // Un perfil nuevo queda "En revisión" hasta que el administrador verifique los documentos (RF-03, RF-04)
    perfil ??= this.perfiles.create({ cuenta, estado: EstadoTrabajador.EN_REVISION });
    perfil.especialidad = especialidad;
    perfil.zona = zona;
    perfil.serviciosAdicionales = dto.serviciosAdicionales ?? [];
    perfil.aniosExperiencia = dto.aniosExperiencia;
    perfil.descripcion = dto.descripcion ?? null;
    const guardado = await this.perfiles.save(perfil);
    return { ...perfilPublico(guardado), estado: guardado.estado };
  }

  async miPerfil(cuentaId: string) {
    const perfil = await this.perfiles.findOne({ where: { cuenta: { id: cuentaId } } });
    if (!perfil) throw new NotFoundException('Todavía no creaste tu perfil de trabajador');
    return { ...perfilPublico(perfil), estado: perfil.estado };
  }
}
