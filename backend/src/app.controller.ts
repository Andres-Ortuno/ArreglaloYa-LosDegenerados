import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Salud')
@Controller()
export class AppController {
  /** Comprueba que el backend está encendido: GET /api/health */
  @Get('health')
  health() {
    return { estado: 'ok', hora: new Date().toISOString() };
  }
}
