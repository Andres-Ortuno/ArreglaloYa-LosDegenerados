import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { PLAZO_MAXIMO_HORAS, PLAZO_MINIMO_HORAS, PLAZO_POR_DEFECTO_HORAS } from '../solicitudes.reglas.js';

/** Los cuatro datos son obligatorios: sin alguno no se guarda la postulación (RF-08). */
export class PostularseDto {
  @ApiProperty({ example: 200, description: 'Monto del trabajo en Bs. Solo lo fija el trabajador (RF-10).' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1000000)
  monto: number;

  @ApiProperty({ enum: ['fotos', 'visita'], description: 'Si cotiza por las fotos o con visita de diagnóstico' })
  @IsIn(['fotos', 'visita'])
  tipoTrabajo: 'fotos' | 'visita';

  @ApiProperty({ example: 30, description: 'Costo de la visita en Bs (0 si no cobra)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  costoVisita: number;

  @ApiProperty({ example: false, description: '¿El monto incluye los materiales?' })
  @IsBoolean()
  incluyeMateriales: boolean;

  @ApiPropertyOptional({
    example: 48,
    description: `Horas que el cliente tiene para elegir tu postulación (por defecto ${PLAZO_POR_DEFECTO_HORAS}). Si vence, puedes renovarla.`,
    minimum: PLAZO_MINIMO_HORAS,
    maximum: PLAZO_MAXIMO_HORAS,
  })
  @IsOptional()
  @IsInt()
  @Min(PLAZO_MINIMO_HORAS)
  @Max(PLAZO_MAXIMO_HORAS)
  plazoHoras?: number;
}
