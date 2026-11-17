import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PerfilTrabajadorDto {
  @ApiProperty({ example: 1, description: 'ID de la zona de trabajo (GET /api/zonas). Nunca el domicilio (RN-11).' })
  @IsInt()
  zonaId: number;

  @ApiProperty({
    type: [Number],
    example: [1],
    description: 'IDs de sus especialidades (GET /api/especialidades). Al menos una.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Elige al menos una especialidad' })
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsInt({ each: true })
  especialidadIds: number[];

  @ApiPropertyOptional({ example: '5 años reparando lavadoras y cocinas a domicilio.', description: 'Historial / experiencia (RF-02)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  historial?: string;

  @ApiPropertyOptional({ example: 50, description: 'Anticipo mínimo en Bs (RN-04). Si no se indica, se usa el 25 %.' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  anticipoMinimo?: number;

  @ApiPropertyOptional({ example: 30, description: 'Margen de error de horario en minutos (RF-14). Por defecto 30.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  margenMinutos?: number;

  @ApiPropertyOptional({ description: 'Enlace a la imagen del QR de pago (RF-11)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  qrPagoUrl?: string;
}
