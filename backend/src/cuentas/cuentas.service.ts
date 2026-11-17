import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Trabajador } from '../trabajadores/trabajador.entity.js';
import { Cliente } from './cliente.entity.js';
import { Cuenta, TipoCuenta } from './cuenta.entity.js';

export type Rol = 'cliente' | 'trabajador';

/** Datos de la cuenta que sí se pueden mostrar (sin la contraseña). */
export function cuentaPublica(cuenta: Cuenta) {
  return {
    id: cuenta.id,
    nombre: cuenta.nombre,
    correo: cuenta.correo,
    telefonoWhatsapp: cuenta.telefonoWhatsapp,
    tipoCuenta: cuenta.tipo,
    esCliente: cuenta.esCliente,
    esTrabajador: cuenta.esTrabajador,
    esAdministrador: cuenta.esAdministrador,
    creadaEn: cuenta.creadaEn,
  };
}

@Injectable()
export class CuentasService {
  constructor(
    @InjectRepository(Cuenta) private readonly cuentas: Repository<Cuenta>,
    @InjectRepository(Trabajador) private readonly trabajadores: Repository<Trabajador>,
    private readonly dataSource: DataSource,
  ) {}

  buscarPorCorreo(correo: string) {
    return this.cuentas.findOne({ where: { correo } });
  }

  async obtener(id: number) {
    const cuenta = await this.cuentas.findOne({ where: { id } });
    if (!cuenta) throw new NotFoundException('La cuenta no existe');
    return cuenta;
  }

  guardar(cuenta: Cuenta) {
    return this.cuentas.save(cuenta);
  }

  /** Bloqueo permanente por robo (RF-21). Lo marca el administrador en la tabla "trabajador". */
  async estaBloqueadaPermanente(cuentaId: number) {
    const total = await this.trabajadores.count({
      where: { cuentaId, bloqueadoPermanente: true },
    });
    return total > 0;
  }

  async crear(datos: {
    nombre: string;
    telefonoWhatsapp: string;
    correo: string;
    password: string;
    tipoCuenta: `${TipoCuenta}`;
    rol: Rol;
    razonSocial?: string;
  }) {
    // RN-02: una empresa solo puede ser cliente
    if (datos.tipoCuenta === TipoCuenta.EMPRESA && datos.rol === 'trabajador') {
      throw new BadRequestException('Una cuenta de empresa solo puede ser cliente');
    }
    if (datos.tipoCuenta === TipoCuenta.EMPRESA && !datos.razonSocial?.trim()) {
      throw new BadRequestException('Una empresa debe indicar su razón social');
    }
    if (await this.buscarPorCorreo(datos.correo)) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await hash(datos.password, 10);

    try {
      // Una sola transacción: la cuenta y, si es cliente, su fila en la tabla "cliente"
      return await this.dataSource.transaction(async (manager) => {
        const cuenta = await manager.save(
          manager.create(Cuenta, {
            correo: datos.correo,
            passwordHash,
            nombre: datos.nombre,
            telefonoWhatsapp: datos.telefonoWhatsapp,
            tipo: datos.tipoCuenta as TipoCuenta,
            esCliente: datos.rol === 'cliente',
            esTrabajador: datos.rol === 'trabajador',
          }),
        );
        if (cuenta.esCliente) {
          await manager.insert(Cliente, {
            cuentaId: cuenta.id,
            razonSocial: datos.tipoCuenta === 'empresa' ? datos.razonSocial!.trim() : null,
          });
        }
        return cuenta;
      });
    } catch (error) {
      // 23505 = correo repetido (dos registros al mismo tiempo)
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  }

  /** RN-01: la misma cuenta puede tener los dos roles. */
  async activarRol(id: number, rol: Rol) {
    const cuenta = await this.obtener(id);
    if (rol === 'trabajador' && cuenta.tipo === TipoCuenta.EMPRESA) {
      throw new BadRequestException('Una cuenta de empresa solo puede ser cliente');
    }
    if (rol === 'trabajador') cuenta.esTrabajador = true;
    else cuenta.esCliente = true;

    return this.dataSource.transaction(async (manager) => {
      const guardada = await manager.save(cuenta);
      if (rol === 'cliente') {
        await manager.query(
          'INSERT INTO cliente (cuenta_id) VALUES ($1) ON CONFLICT (cuenta_id) DO NOTHING',
          [id],
        );
      }
      return guardada;
    });
  }
}
