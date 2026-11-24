
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SolicitudesService } from
  '../../services/solicitudes.services';

import type {
  Pedido,
  EstadoPedido
} from '../../services/solicitudes.services';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css'
})
export class Pedidos {

  private readonly solicitudesService =
    inject(SolicitudesService);

  filtroEstado: string = 'Todos';

  readonly pasos: EstadoPedido[] = [
    'Pendiente',
    'En proceso',
    'Finalizado'
  ];

  readonly estrellas: number[] = [1, 2, 3, 4, 5];

  // CONSULTAR LA LISTA COMPARTIDA
  get pedidos(): Pedido[] {
    return this.solicitudesService.pedidos();
  }

  // FILTRAR LOS PEDIDOS
  get pedidosFiltrados(): Pedido[] {

    if (this.filtroEstado === 'Todos') {
      return this.pedidos;
    }

    return this.pedidos.filter(
      pedido => pedido.estado === this.filtroEstado
    );
  }

  // MOSTRAR EL AVANCE
  indicePaso(estado: EstadoPedido): number {
    return this.pasos.indexOf(estado);
  }

  // AVANZAR ESTADO DE DEMOSTRACIÓN
  avanzarEstado(pedido: Pedido): void {

    if (pedido.estado === 'Finalizado') {
      return;
    }

    const nuevoEstado: EstadoPedido =
      pedido.estado === 'Pendiente'
        ? 'En proceso'
        : 'Finalizado';

    this.solicitudesService.actualizarPedido(
      pedido.id,
      {
        estado: nuevoEstado,
        mensaje:
          'Estado actualizado solo en esta demostración.'
      }
    );
  }

  // SIMULAR PAGO
  simularPago(pedido: Pedido): void {

    if (
      pedido.estado !== 'Finalizado' ||
      pedido.monto === null
    ) {
      this.solicitudesService.actualizarPedido(
        pedido.id,
        {
          mensaje:
            'El pedido debe estar finalizado ' +
            'y tener un monto definido.'
        }
      );
      return;
    }

    if (pedido.pagoSimulado) {
      return;
    }

    this.solicitudesService.actualizarPedido(
      pedido.id,
      {
        pagoSimulado: true,
        mensaje:
          'Pago simulado. No se realizó ' +
          'ninguna transacción real.'
      }
    );
  }

  // ELEGIR ESTRELLAS
  seleccionarCalificacion(
    pedido: Pedido,
    estrellas: number
  ): void {

    if (
      pedido.estado !== 'Finalizado' ||
      pedido.calificacionGuardada
    ) {
      return;
    }

    this.solicitudesService.actualizarPedido(
      pedido.id,
      { calificacion: estrellas }
    );
  }

  // GUARDAR UNA CALIFICACIÓN DE PRUEBA
  guardarCalificacion(pedido: Pedido): void {

    if (pedido.estado !== 'Finalizado') {
      return;
    }

    if (pedido.calificacionGuardada) {
      return;
    }

    if (
      pedido.calificacion < 1 ||
      pedido.calificacion > 5
    ) {
      this.solicitudesService.actualizarPedido(
        pedido.id,
        {
          mensaje:
            'Selecciona una calificación ' +
            'de 1 a 5 estrellas.'
        }
      );
      return;
    }

    this.solicitudesService.actualizarPedido(
      pedido.id,
      {
        comentario: pedido.comentario.trim(),
        calificacionGuardada: true,
        mensaje:
          'Calificación guardada en esta demostración.'
      }
    );
  }
  
aceptarPropuesta(pedido: Pedido): void {

  if (
    pedido.estado !== 'Pendiente' ||
    !pedido.propuesta
  ) {
    return;
  }

  this.solicitudesService.actualizarPedido(
    pedido.id,
    {
      estado: 'En proceso',
      mensaje:
        'Propuesta aceptada en esta demostración.'
    }
  );
}

}
