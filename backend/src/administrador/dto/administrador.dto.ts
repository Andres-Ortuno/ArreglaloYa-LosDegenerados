import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RechazarDocumentoDto {
  @ApiProperty({ example: 'La foto del carnet está borrosa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(300)
  motivo: string;
}

export class ValidarReporteDto {
  @ApiPropertyOptional({ example: 'FELCC-CBBA-2026-004512', description: 'Obligatoria cuando el reporte es por robo (RF-21)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  denunciaPolicial?: string;
}

export class RechazarReporteDto {
  @ApiPropertyOptional({ example: 'No hay evidencia suficiente' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}

export class FiltroTrabajadoresDto {
  @ApiPropertyOptional({ enum: ['en_revision', 'activo', 'suspendido'], default: 'en_revision' })
  @IsOptional()
  @IsIn(['en_revision', 'activo', 'suspendido'])
  estado?: 'en_revision' | 'activo' | 'suspendido';
}

export class FiltroReportesDto {
  @ApiPropertyOptional({ enum: ['pendiente', 'valido', 'rechazado'], default: 'pendiente' })
  @IsOptional()
  @IsIn(['pendiente', 'valido', 'rechazado'])
  estado?: 'pendiente' | 'valido' | 'rechazado';
}

export class FiltroFechasDto {
  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}
