import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogosService } from '../catalogos/catalogos.service.js';
import { TipoCuenta } from '../cuentas/cuenta.entity.js';
import { CuentasService } from '../cuentas/cuentas.service.js';
import { EstadoTrabajador, PerfilTrabajador } from '../trabajadores/perfil-trabajador.entity.js';

const DEMO = [
  { nombres: 'Carlos', apellidos: 'Mendoza', especialidad: 'Reparación de electrodomésticos', zona: 'Cercado', anios: 5, servicios: ['Lavadoras', 'Cocinas'], nota: 4.8, opiniones: 24 },
  { nombres: 'María', apellidos: 'López', especialidad: 'Albañilería', zona: 'Sacaba', anios: 6, servicios: ['Paredes', 'Revoque'], nota: 4.9, opiniones: 18 },
  { nombres: 'Jorge', apellidos: 'Rojas', especialidad: 'Reparación de electrodomésticos', zona: 'Tiquipaya', anios: 3, servicios: ['Refrigeradores', 'Secadoras'], nota: 4.7, opiniones: 12 },
];

/**
 * Crea 3 trabajadores de ejemplo ya Activos (los de las maquetas) para poder
 * probar la búsqueda antes de que exista la verificación del administrador.
 * Solo corre si en el .env está SEED_DEMO=true.
 * Correos: carlos.demo@arreglaloya.test, maria.demo@..., jorge.demo@...  Contraseña: Demo12345
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cuentas: CuentasService,
    private readonly catalogos: CatalogosService,
    @InjectRepository(PerfilTrabajador) private readonly perfiles: Repository<PerfilTrabajador>,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('SEED_DEMO') !== 'true') return;
    await this.catalogos.sembrar();
    for (const d of DEMO) {
      const correo = `${d.nombres.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.demo@arreglaloya.test`;
      if (await this.cuentas.buscarPorCorreo(correo)) continue;
      const cuenta = await this.cuentas.crear({
        nombres: d.nombres,
        apellidos: d.apellidos,
        correo,
        password: 'Demo12345',
        tipoCuenta: TipoCuenta.PERSONA,
        rol: 'trabajador',
      });
      const especialidad = await this.catalogos.buscarEspecialidadPorNombre(d.especialidad);
      const zona = await this.catalogos.buscarZonaPorNombre(d.zona);
      if (!especialidad || !zona) continue;
      await this.perfiles.save(
        this.perfiles.create({
          cuenta,
          especialidad,
          zona,
          serviciosAdicionales: d.servicios,
          aniosExperiencia: d.anios,
          estado: EstadoTrabajador.ACTIVO,
          calificacionPromedio: d.nota,
          cantidadOpiniones: d.opiniones,
        }),
      );
    }
    this.log.log('Datos de demostración listos (SEED_DEMO=true)');
  }
}
