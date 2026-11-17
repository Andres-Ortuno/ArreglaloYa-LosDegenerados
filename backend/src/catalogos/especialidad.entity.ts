import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Tabla "especialidad" del script SQL. */
@Entity('especialidad')
export class Especialidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;
}
