import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Estados de la cuenta del trabajador (sección 5 del documento). */
export enum EstadoTrabajador {
  EN_REVISION = 'en_revision',
  ACTIVO = 'activo',
  SUSPENDIDO = 'suspendido',
}

/**
 * Tabla "trabajador" del script SQL. Solo guarda la zona, nunca el domicilio (RN-11).
 * Sus especialidades están en la tabla "trabajador_especialidad" (varias por trabajador).
 */
@Entity('trabajador')
export class Trabajador {
  @PrimaryColumn({ name: 'cuenta_id' })
  cuentaId: number;

  @Column({ name: 'zona_id' })
  zonaId: number;

  @Column({
    type: 'enum',
    enum: EstadoTrabajador,
    enumName: 'estado_trabajador',
    default: EstadoTrabajador.EN_REVISION,
  })
  estado: EstadoTrabajador;

  @Column({ type: 'text', nullable: true })
  historial: string | null;

  @Column({ name: 'numero_documento', type: 'varchar', length: 30, nullable: true })
  numeroDocumento: string | null;

  @Column({ name: 'qr_pago_url', type: 'varchar', length: 300, nullable: true })
  qrPagoUrl: string | null;

  @Column({
    name: 'anticipo_minimo',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    // PostgreSQL devuelve los numeric como texto; aquí los pasamos a número
    transformer: {
      to: (valor: number | null) => valor,
      from: (valor: string | null) => (valor === null ? null : parseFloat(valor)),
    },
  })
  anticipoMinimo: number | null;

  @Column({ name: 'margen_minutos', type: 'smallint', default: 30 })
  margenMinutos: number;

  @Column({ name: 'bloqueado_permanente', type: 'boolean', default: false })
  bloqueadoPermanente: boolean;

  @Column({ name: 'suspendido_hasta', type: 'timestamp', nullable: true })
  suspendidoHasta: Date | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp' })
  creadoEn: Date;
}
