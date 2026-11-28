
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class BuscarTrabajadoresDto {
  @ApiPropertyOptional({ description: 'Filtra por zona' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  zonaId?: number;

  @ApiPropertyOptional({ description: 'Filtra por especialidad' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  especialidadId?: number;

  @ApiPropertyOptional({ description: 'Calificación mínima (1 a 5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  calificacionMinima?: number;

  @ApiPropertyOptional({ description: 'Número de página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ description: 'Cantidad de resultados por página' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite?: number;

  @ApiPropertyOptional({
    description: 'Criterio de ordenamiento',
    enum: ['calificacion', 'opiniones', 'nombre'],
  })
  @IsOptional()
  @IsIn(['calificacion', 'opiniones', 'nombre'])
  ordenarPor?: 'calificacion' | 'opiniones' | 'nombre';
}
