import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistroDto {
  @ApiProperty({ enum: ['persona', 'empresa'] })
  @IsIn(['persona', 'empresa'])
  tipoCuenta: 'persona' | 'empresa';

  @ApiProperty({ enum: ['cliente', 'trabajador'], description: 'Cómo usará la plataforma' })
  @IsIn(['cliente', 'trabajador'])
  rol: 'cliente' | 'trabajador';

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombres: string;

  @ApiProperty({ example: 'Mendoza' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellidos: string;

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
