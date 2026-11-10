import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('especialidades')
export class Especialidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;
}
