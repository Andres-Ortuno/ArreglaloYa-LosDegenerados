import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class ElegirPostulacionDto {
  @ApiProperty({ example: 1, description: 'ID de la postulación elegida' })
  @IsInt()
  postulacionId: number;

  @ApiProperty({ example: 1, description: 'ID del horario de la solicitud que el cliente confirma' })
  @IsInt()
  horarioId: number;
}
