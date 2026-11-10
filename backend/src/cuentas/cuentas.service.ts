import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { Cuenta, TipoCuenta } from './cuenta.entity.js';

export type Rol = 'cliente' | 'trabajador';

/** Datos de la cuenta que sí se pueden mostrar (sin la contraseña). */
export function cuentaPublica(cuenta: Cuenta) {
  return {
    id: cuenta.id,
    nombres: cuenta.nombres,
    apellidos: cuenta.apellidos,
    correo: cuenta.correo,
    tipoCuenta: cuenta.tipoCuenta,
    esCliente: cuenta.esCliente,
    esTrabajador: cuenta.esTrabajador,
    creadoEn: cuenta.creadoEn,
  };
}

@Injectable()
export class CuentasService {
  constructor(@InjectRepository(Cuenta) private readonly cuentas: Repository<Cuenta>) {}

  buscarPorCorreo(correo: string) {
    return this.cuentas.findOne({ where: { correo } });
  }

  async obtener(id: string) {
    const cuenta = await this.cuentas.findOne({ where: { id } });
    if (!cuenta) throw new NotFoundException('La cuenta no existe');
    return cuenta;
  }

  guardar(cuenta: Cuenta) {
    return this.cuentas.save(cuenta);
  }

  async crear(datos: {
    nombres: string;
    apellidos: string;
    correo: string;
    password: string;
    tipoCuenta: `${TipoCuenta}`;
    rol: Rol;
  }) {
    // RN-02: una empresa solo puede ser cliente
    if (datos.tipoCuenta === TipoCuenta.EMPRESA && datos.rol === 'trabajador') {
      throw new BadRequestException('Una cuenta de empresa solo puede ser cliente');
    }
    if (await this.buscarPorCorreo(datos.correo)) {
      throw new ConflictException('Ya existe una cuenta con ese correo');
    }
    const cuenta = this.cuentas.create({
      nombres: datos.nombres,
      apellidos: datos.apellidos,
      correo: datos.correo,
      passwordHash: await hash(datos.password, 10),
      tipoCuenta: datos.tipoCuenta as TipoCuenta,
      esCliente: datos.rol === 'cliente',
      esTrabajador: datos.rol === 'trabajador',
    });
    return this.cuentas.save(cuenta);
  }

  /** RN-01: la misma cuenta puede tener los dos roles. */
  async activarRol(id: string, rol: Rol) {
    const cuenta = await this.obtener(id);
    if (rol === 'trabajador' && cuenta.tipoCuenta === TipoCuenta.EMPRESA) {
      throw new BadRequestException('Una cuenta de empresa solo puede ser cliente');
    }
    if (rol === 'trabajador') cuenta.esTrabajador = true;
    else cuenta.esCliente = true;
    return this.cuentas.save(cuenta);
  }
}
