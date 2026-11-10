import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoCuenta {
  PERSONA = 'persona',
  EMPRESA = 'empresa',
}

/** Usuario registrado. Puede ser cliente, trabajador o ambos (RN-01). */
@Entity('cuentas')
export class Cuenta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombres: string;

  @Column({ length: 100 })
  apellidos: string;

  @Column({ length: 150, unique: true })
  correo: string;

  @Column({ name: 'password_hash', length: 100 })
  passwordHash: string;

  @Column({ name: 'tipo_cuenta', type: 'varchar', length: 10, default: TipoCuenta.PERSONA })
  tipoCuenta: TipoCuenta;

  @Column({ name: 'es_cliente', type: 'boolean', default: false })
  esCliente: boolean;

  @Column({ name: 'es_trabajador', type: 'boolean', default: false })
  esTrabajador: boolean;

  /** Bloqueo permanente (por ejemplo, por robo). Lo aplica un administrador (RN-09). */
  @Column({ type: 'boolean', default: false })
  bloqueada: boolean;

  @Column({ name: 'intentos_fallidos', type: 'int', default: 0 })
  intentosFallidos: number;

  /** Bloqueo temporal tras 5 intentos fallidos de inicio de sesión (RF-33). */
  @Column({ name: 'bloqueada_hasta', type: 'timestamptz', nullable: true })
  bloqueadaHasta: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
