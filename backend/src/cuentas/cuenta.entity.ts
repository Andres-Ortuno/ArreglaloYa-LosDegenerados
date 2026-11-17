import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoCuenta {
  PERSONA = 'persona',
  EMPRESA = 'empresa',
}

/** Tabla "cuenta" del script SQL. Puede ser cliente, trabajador, administrador o varios (RN-01). */
@Entity('cuenta')
export class Cuenta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150, unique: true })
  correo: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ length: 120 })
  nombre: string;

  /** Número para los avisos por WhatsApp (RF-17). */
  @Column({ name: 'telefono_whatsapp', length: 20 })
  telefonoWhatsapp: string;

  @Column({ type: 'enum', enum: TipoCuenta, enumName: 'tipo_cuenta', default: TipoCuenta.PERSONA })
  tipo: TipoCuenta;

  @Column({ name: 'es_cliente', type: 'boolean', default: true })
  esCliente: boolean;

  @Column({ name: 'es_trabajador', type: 'boolean', default: false })
  esTrabajador: boolean;

  @Column({ name: 'es_administrador', type: 'boolean', default: false })
  esAdministrador: boolean;

  @Column({ name: 'intentos_fallidos', type: 'smallint', default: 0 })
  intentosFallidos: number;

  /** Bloqueo temporal de 15 minutos tras 5 intentos fallidos (RF-33, RNF-02). */
  @Column({ name: 'bloqueada_hasta', type: 'timestamp', nullable: true })
  bloqueadaHasta: Date | null;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamp' })
  creadaEn: Date;
}
