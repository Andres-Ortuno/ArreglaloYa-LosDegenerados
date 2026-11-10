import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PerfilTrabajadorDto {
  @ApiProperty({ example: 1, description: 'ID de la especialidad principal (GET /api/especialidades)' })
  @IsInt()
  especialidadId: number;

  @ApiProperty({ example: 1, description: 'ID de la zona de trabajo (GET /api/zonas)' })
  @IsInt()
  zonaId: number;

  @ApiPropertyOptional({ type: [String], example: ['Lavadoras', 'Cocinas'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  serviciosAdicionales?: string[];

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Max(60)
  aniosExperiencia: number;

  @ApiPropertyOptional({ example: 'Reparo lavadoras y cocinas a domicilio.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
