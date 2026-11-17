import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class HorarioDto {
  @ApiProperty({ example: '2026-11-20T10:00:00', description: 'Hora local de Bolivia, sin zona horaria' })
  @IsISO8601()
  inicio: string;

  @ApiProperty({ example: '2026-11-20T12:00:00' })
  @IsISO8601()
  fin: string;
}

export class CrearSolicitudDto {
  @ApiProperty({ example: 1, description: 'GET /api/especialidades' })
  @IsInt()
  especialidadId: number;

  @ApiProperty({ example: 1, description: 'GET /api/zonas' })
  @IsInt()
  zonaId: number;

  @ApiProperty({ example: 'Se rompió el tubo debajo del lavaplatos y gotea.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion: string;

  @ApiProperty({ example: 'Av. América #123, cerca de la plaza', description: 'Dónde es el trabajo (RF-05)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  ubicacion: string;

  @ApiPropertyOptional({ example: -17.3935 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ example: -66.157 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @ApiPropertyOptional({ type: [String], description: 'Enlaces de las fotos (opcionales, máximo 6)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  fotos?: string[];

  @ApiProperty({ type: [HorarioDto], description: 'Al menos un horario en el que puede recibir al trabajador (RF-05)' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Indica al menos un horario disponible' })
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => HorarioDto)
  horarios: HorarioDto[];
}
