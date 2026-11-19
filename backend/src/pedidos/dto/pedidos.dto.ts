import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Pago del anticipo o del saldo. En la V1 el pago es simulado (R-06): la referencia es el comprobante. */
export class PagarDto {
  @ApiProperty({ enum: ['qr', 'tarjeta'] })
  @IsIn(['qr', 'tarjeta'])
  medio: 'qr' | 'tarjeta';

  @ApiPropertyOptional({ example: 'COMPROBANTE-123', description: 'Número del comprobante del QR o de la tarjeta' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;
}

/** RF-27: el trabajador propone otro monto y debe dar una razón. */
export class CambioMontoDto {
  @ApiProperty({ example: 300 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999)
  montoNuevo: number;

  @ApiProperty({ example: 'Hay que cambiar el motor, no solo la correa.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  motivo: string;
}

export class ResponderCambioDto {
  @ApiProperty({ description: 'true = acepta el nuevo monto; false = lo rechaza (se cancela el pedido)' })
  @IsBoolean()
  aceptar: boolean;
}

export class MotivoDto {
  @ApiPropertyOptional({ example: 'Ya no necesito el trabajo' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
