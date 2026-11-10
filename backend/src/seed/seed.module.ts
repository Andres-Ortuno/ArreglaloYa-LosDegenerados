import { Module } from '@nestjs/common';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { TrabajadoresModule } from '../trabajadores/trabajadores.module.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [CuentasModule, CatalogosModule, TrabajadoresModule],
  providers: [SeedService],
})
export class SeedModule {}
