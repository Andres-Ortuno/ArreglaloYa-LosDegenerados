import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class BuscarTrabajadoresDto {
  @ApiPropertyOptional({ description: 'Filtra por zona' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zonaId?: number;

  @ApiPropertyOptional({ description: 'Filtra por especialidad' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  especialidadId?: number;
}
