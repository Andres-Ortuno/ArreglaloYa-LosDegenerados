import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { PLAZO_MAXIMO_HORAS, PLAZO_MINIMO_HORAS, PLAZO_POR_DEFECTO_HORAS } from '../solicitudes.reglas.js';

/** Los dos datos son opcionales: sin nada, se renueva por el plazo normal y con el mismo monto. */
export class RenovarPostulacionDto {
  @ApiPropertyOptional({
    example: 48,
    description: `Horas nuevas para que el cliente elija (por defecto ${PLAZO_POR_DEFECTO_HORAS}). Nunca pasa del vencimiento de la solicitud.`,
    minimum: PLAZO_MINIMO_HORAS,
    maximum: PLAZO_MAXIMO_HORAS,
  })
  @IsOptional()
  @IsInt()
  @Min(PLAZO_MINIMO_HORAS)
  @Max(PLAZO_MAXIMO_HORAS)
  plazoHoras?: number;

  @ApiPropertyOptional({ example: 180, description: 'Nuevo monto en Bs, si quieres cambiarlo al renovar (RF-10).' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1000000)
  monto?: number;
}
