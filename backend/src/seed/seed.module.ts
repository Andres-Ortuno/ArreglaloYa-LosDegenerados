import { Module } from '@nestjs/common';
import { CatalogosModule } from '../catalogos/catalogos.module.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { SeedService } from './seed.service.js';

@Module({
  imports: [CuentasModule, CatalogosModule],
  providers: [SeedService],
})
export class SeedModule {}
