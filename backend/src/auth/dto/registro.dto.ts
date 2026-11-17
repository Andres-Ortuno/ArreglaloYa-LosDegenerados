import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @ApiProperty({ enum: ['persona', 'empresa'] })
  @IsIn(['persona', 'empresa'])
  tipoCuenta: 'persona' | 'empresa';

  @ApiProperty({ enum: ['cliente', 'trabajador'], description: 'Cómo usará la plataforma' })
  @IsIn(['cliente', 'trabajador'])
  rol: 'cliente' | 'trabajador';

  @ApiProperty({ example: 'Carlos Mendoza', description: 'Nombre completo (o nombre del contacto)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: '+59170000000', description: 'Número de WhatsApp para los avisos (RF-17)' })
  @Matches(/^\+?\d{7,15}$/, { message: 'El teléfono debe tener entre 7 y 15 dígitos (puede empezar con +)' })
  @MaxLength(20)
  telefonoWhatsapp: string;

  @ApiPropertyOptional({ example: 'Constructora Andina S.R.L.', description: 'Obligatorio si es empresa' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  razonSocial?: string;

  @ApiProperty({ example: 'carlos@correo.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(150)
  correo: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  password: string;
}
