import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const TIPOS_DOCUMENTO = ['identidad', 'antecedentes', 'experiencia'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export class SubirDocumentoDto {
  @ApiProperty({ enum: TIPOS_DOCUMENTO })
  @IsIn(TIPOS_DOCUMENTO)
  tipo: TipoDocumento;
}
