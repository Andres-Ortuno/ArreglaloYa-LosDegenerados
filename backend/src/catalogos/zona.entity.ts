import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Tabla "zona" del script SQL. */
@Entity('zona')
export class Zona {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;
}
