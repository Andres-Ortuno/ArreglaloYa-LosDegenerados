import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Tabla "cliente" del script SQL: una fila por cada cuenta con rol de cliente. */
@Entity('cliente')
export class Cliente {
  @PrimaryColumn({ name: 'cuenta_id' })
  cuentaId: number;

  /** Solo para empresas. */
  @Column({ name: 'razon_social', type: 'varchar', length: 150, nullable: true })
  razonSocial: string | null;
}
