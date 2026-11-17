import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CatalogosService } from '../catalogos/catalogos.service.js';
import { TipoCuenta } from '../cuentas/cuenta.entity.js';
import { CuentasService } from '../cuentas/cuentas.service.js';

// Los nombres de zona y especialidad son los del script SQL (sección 10).
const DEMO = [
  { nombre: 'Carlos Mendoza', telefono: '+59170000001', especialidad: 'Reparación de electrodomésticos', zona: 'Zona Norte', historial: '5 años reparando lavadoras y cocinas.' },
  { nombre: 'María López', telefono: '+59170000002', especialidad: 'Albañilería', zona: 'Zona Sur', historial: '6 años en paredes y revoque.' },
  { nombre: 'Jorge Rojas', telefono: '+59170000003', especialidad: 'Reparación de electrodomésticos', zona: 'Zona Central', historial: '3 años con refrigeradores y secadoras.' },
];

/**
 * Crea 3 trabajadores de ejemplo ya Activos para poder probar la búsqueda antes de que exista
 * la verificación del administrador. Solo corre si en el .env está SEED_DEMO=true.
 * Requiere que el script SQL ya se haya ejecutado (zonas y especialidades cargadas).
 * Correos: carlos.demo@arreglaloya.test, maria.demo@..., jorge.demo@...  Contraseña: Demo12345
 *
 * Nota: la calificación promedio la calcula la vista v_trabajador_publico a partir de la tabla
 * "calificacion", que exige pedidos finalizados. Por eso los demos aparecen sin opiniones.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cuentas: CuentasService,
    private readonly catalogos: CatalogosService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    if (this.config.get<string>('SEED_DEMO') !== 'true') return;
    for (const d of DEMO) {
      const primerNombre = d.nombre.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const correo = `${primerNombre}.demo@arreglaloya.test`;
      if (await this.cuentas.buscarPorCorreo(correo)) continue;

      const especialidad = await this.catalogos.buscarEspecialidadPorNombre(d.especialidad);
      const zona = await this.catalogos.buscarZonaPorNombre(d.zona);
      if (!especialidad || !zona) {
        this.log.warn(`Faltan zonas o especialidades: ¿ya ejecutaste el script SQL? (${d.nombre} no se creó)`);
        continue;
      }
      const cuenta = await this.cuentas.crear({
        nombre: d.nombre,
        telefonoWhatsapp: d.telefono,
        correo,
        password: 'Demo12345',
        tipoCuenta: TipoCuenta.PERSONA,
        rol: 'trabajador',
      });
      await this.dataSource.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO trabajador (cuenta_id, zona_id, estado, historial) VALUES ($1, $2, 'activo', $3)`,
          [cuenta.id, zona.id, d.historial],
        );
        await manager.query(
          'INSERT INTO trabajador_especialidad (trabajador_id, especialidad_id) VALUES ($1, $2)',
          [cuenta.id, especialidad.id],
        );
      });
    }
    this.log.log('Datos de demostración listos (SEED_DEMO=true)');
  }
}
