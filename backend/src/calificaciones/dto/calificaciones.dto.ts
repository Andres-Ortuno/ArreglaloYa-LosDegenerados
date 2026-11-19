import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ReporteDto {
  @ApiProperty({ enum: ['incumplimiento', 'estafa', 'robo'] })
  @IsIn(['incumplimiento', 'estafa', 'robo'])
  tipo: 'incumplimiento' | 'estafa' | 'robo';

  @ApiProperty({ example: 'No llegó a la hora y no avisó.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion: string;
}

/** RF-18 (cliente) y RF-19 (trabajador). */
export class CalificarDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  estrellas: number;

  @ApiPropertyOptional({ example: 'Trabajo limpio y puntual', description: 'Solo el cliente puede comentar (RF-19)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;

  @ApiPropertyOptional({ type: ReporteDto, description: 'Solo el cliente. Se adjunta a la calificación (RF-32)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReporteDto)
  reporte?: ReporteDto;
}
