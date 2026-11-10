import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Especialidad } from '../catalogos/especialidad.entity.js';
import { Zona } from '../catalogos/zona.entity.js';
import { Cuenta } from '../cuentas/cuenta.entity.js';

/** Estados de la cuenta del trabajador (sección 5 del documento). */
export enum EstadoTrabajador {
  EN_REVISION = 'en_revision',
  ACTIVO = 'activo',
  SUSPENDIDO = 'suspendido',
}

/** Perfil público del trabajador. Solo guarda la zona, nunca el domicilio (RN-11). */
@Entity('perfiles_trabajador')
export class PerfilTrabajador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Cuenta, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'cuenta_id' })
  cuenta: Relation<Cuenta>;

  @ManyToOne(() => Especialidad, { nullable: false, eager: true })
  @JoinColumn({ name: 'especialidad_id' })
  especialidad: Relation<Especialidad>;

  @ManyToOne(() => Zona, { nullable: false, eager: true })
  @JoinColumn({ name: 'zona_id' })
  zona: Relation<Zona>;

  @Column({ name: 'servicios_adicionales', type: 'text', array: true, default: '{}' })
  serviciosAdicionales: string[];

  @Column({ name: 'anios_experiencia', type: 'int', default: 0 })
  aniosExperiencia: number;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'varchar', length: 15, default: EstadoTrabajador.EN_REVISION })
  estado: EstadoTrabajador;

  @Column({
    name: 'calificacion_promedio',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
    // PostgreSQL devuelve los numeric como texto; aquí los pasamos a número
    transformer: { to: (valor: number) => valor, from: (valor: string | null) => (valor === null ? 0 : parseFloat(valor)) },
  })
  calificacionPromedio: number;

  @Column({ name: 'cantidad_opiniones', type: 'int', default: 0 })
  cantidadOpiniones: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
