
import { Injectable, signal } from '@angular/core';

// IMPORTAR LOS MODELOS
import type {
  DatosSolicitud,
  Pedido
} from '../models/pedido.model';

// EXPORTAR LOS MODELOS PARA LAS OTRAS PÁGINAS
export type {
  EstadoPedido,
  DatosSolicitud,
  PropuestaPedido,
  Pedido
} from '../models/pedido.model';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {

  // LISTA COMPARTIDA DE PEDIDOS
  private readonly _pedidos = signal<Pedido[]>([
    {
      id: 101,
      titulo: 'Reparación de lavadora',
      especialidad: 'Electrodomésticos',
      descripcion: 'La lavadora no enciende.',
      zona: 'Sacaba',
      horario: 'Tarde',
      fecha: '2026-11-18',
      estado: 'En proceso',
      trabajador: 'Perfil de ejemplo 2',
      monto: 180,
      pagoSimulado: false,
      calificacion: 0,
      comentario: '',
      calificacionGuardada: false,
      mensaje: ''
    },
    {
      id: 102,
      titulo: 'Reparación de pared',
      especialidad: 'Albañilería',
      descripcion: 'Necesito reparar una pared.',
      zona: 'Cercado',
      horario: 'Mañana',
      fecha: '2026-11-15',
      estado: 'Finalizado',
      trabajador: 'Perfil de ejemplo 1',
      monto: 150,
      pagoSimulado: false,
      calificacion: 0,
      comentario: '',
      calificacionGuardada: false,
      mensaje: ''
    },
    {
      id: 103,
      titulo: 'Arreglo de muro',
      especialidad: 'Albañilería',
      descripcion: 'Necesito arreglar un muro.',
      zona: 'Quillacollo',
      horario: 'A coordinar',
      fecha: '2026-11-20',
      estado: 'Pendiente',
      trabajador: 'Por asignar',
      monto: null,
      pagoSimulado: false,
      calificacion: 0,
      comentario: '',
      calificacionGuardada: false,
      mensaje: ''
    }
  ]);

  // CONSULTAR LOS PEDIDOS COMPARTIDOS
  readonly pedidos = this._pedidos.asReadonly();

  // CREAR UNA NUEVA SOLICITUD
  crearSolicitud(datos: DatosSolicitud): void {

    const mayorId = this._pedidos().reduce(
      (mayor, pedido) => Math.max(mayor, pedido.id),
      100
    );

    const hoy = new Date();

    const fecha =
      hoy.getFullYear() + '-' +
      String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
      String(hoy.getDate()).padStart(2, '0');

    const nuevoPedido: Pedido = {
      ...datos,
      id: mayorId + 1,
      fecha: fecha,
      estado: 'Pendiente',
      trabajador: 'Por asignar',
      monto: null,
      pagoSimulado: false,
      calificacion: 0,
      comentario: '',
      calificacionGuardada: false,
      mensaje: ''
    };

    this._pedidos.update(
      listaActual => [nuevoPedido, ...listaActual]
    );
  }

  // ACTUALIZAR UN PEDIDO EXISTENTE
  actualizarPedido(
    id: number,
    cambios: Partial<Pedido>
  ): void {

    this._pedidos.update(listaActual =>
      listaActual.map(pedido =>
        pedido.id === id
          ? { ...pedido, ...cambios }
          : pedido
      )
    );
  }
}
  