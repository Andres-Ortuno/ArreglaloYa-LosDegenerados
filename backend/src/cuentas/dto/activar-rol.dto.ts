import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ActivarRolDto {
  @ApiProperty({ enum: ['cliente', 'trabajador'] })
  @IsIn(['cliente', 'trabajador'])
  rol: 'cliente' | 'trabajador';
}
