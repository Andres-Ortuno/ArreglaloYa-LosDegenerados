import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('zonas')
export class Zona {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 80, unique: true })
  nombre: string;
}
