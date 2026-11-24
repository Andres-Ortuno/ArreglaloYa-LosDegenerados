import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';

import type { Especialidad, Zona } from '../../models/backend.models';
import { AuthService } from '../../services/auth.service';
import { ApiCatalogos } from '../../services/backend/api-catalogos';
import { ApiTrabajadores } from '../../services/backend/api-trabajadores';
import { mensajeDeError } from '../../services/backend/errores';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro implements OnInit {

  private readonly auth = inject(AuthService);
  private readonly catalogos = inject(ApiCatalogos);
  private readonly trabajadores = inject(ApiTrabajadores);
  private readonly router = inject(Router);

  nombre: string = '';
  correo: string = '';
  telefono: string = '';
  tipoCuenta: 'persona' | 'empresa' = 'persona';
  razonSocial: string = '';
  contrasena: string = '';
  confirmarContrasena: string = '';

  tipoUsuario: string = '';
  // Se guardan los números (id) de la zona y la especialidad que vienen del backend
  especialidad: string = '';
  zona: string = '';

  // Listas que llegan del backend
  zonas: Zona[] = [];
  especialidades: Especialidad[] = [];

  mensaje: string = '';
  registroValido: boolean = false;
  enviando: boolean = false;

  ngOnInit(): void {
    this.catalogos.zonas().subscribe({
      next: (lista) => (this.zonas = lista),
      error: (e) => (this.mensaje = mensajeDeError(e))
    });
    this.catalogos.especialidades().subscribe({
      next: (lista) => (this.especialidades = lista),
      error: (e) => (this.mensaje = mensajeDeError(e))
    });
  }

  /** Teléfono con 7 a 15 dígitos, con + opcional al inicio. Espacios y guiones se ignoran. */
  telefonoValido(): boolean {
    return /^\+?\d{7,15}$/.test(this.telefonoLimpio());
  }

  private telefonoLimpio(): string {
    return this.telefono.replace(/[\s-]/g, '');
  }

  registrar(formulario: NgForm): void {

    this.mensaje = '';
    this.registroValido = false;

    // Eliminar espacios innecesarios
    const nombre = this.nombre.trim();
    const correo = this.correo.trim();

    // Validar formato del correo
    const correoValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);

    // COMPROBAR CAMPOS OBLIGATORIOS
    if (
      formulario.invalid ||
      nombre.length < 3 ||
      !correoValido ||
      !this.telefonoValido() ||
      this.contrasena.length < 8 ||
      !this.tipoUsuario
    ) {
      formulario.control.markAllAsTouched();

      this.mensaje =
        'Revisa los datos obligatorios. ' +
        'El nombre debe tener al menos 3 caracteres, ' +
        'el correo y el teléfono deben ser válidos y la contraseña ' +
        'debe tener al menos 8 caracteres.';

      return;
    }

    // COMPROBAR QUE LAS CONTRASEÑAS COINCIDAN
    if (this.contrasena !== this.confirmarContrasena) {

      this.mensaje =
        'Las contraseñas no coinciden.';

      return;
    }

    // REGLAS DE EMPRESA (RN-02): solo puede ser cliente y necesita razón social
    if (this.tipoCuenta === 'empresa') {

      if (this.tipoUsuario === 'trabajador') {
        this.mensaje = 'Una empresa solo puede registrarse como cliente.';
        return;
      }

      if (this.razonSocial.trim().length < 3) {
        this.mensaje = 'Indica la razón social de la empresa.';
        return;
      }
    }

    // VALIDACIONES ESPECIALES PARA TRABAJADORES
    if (this.tipoUsuario === 'trabajador') {

      if (!this.especialidad || !this.zona) {
        this.mensaje =
          'Si te registras como trabajador, ' +
          'debes seleccionar una especialidad ' +
          'y tu zona de trabajo.';

        return;
      }
    }

    // CREAR LA CUENTA EN EL BACKEND
    this.enviando = true;

    const rol = this.tipoUsuario as 'cliente' | 'trabajador';
    const registro$ = this.auth.registrar({
      tipoCuenta: this.tipoCuenta,
      rol,
      nombre,
      telefonoWhatsapp: this.telefonoLimpio(),
      razonSocial: this.tipoCuenta === 'empresa' ? this.razonSocial.trim() : undefined,
      correo,
      password: this.contrasena
    });

    // Un trabajador, además, crea su perfil con la zona y la especialidad elegidas.
    // Queda «en revisión» hasta que el administrador lo verifique.
    const flujo$: Observable<unknown> = rol === 'trabajador'
      ? registro$.pipe(
          switchMap(() => this.trabajadores.guardarMiPerfil({
            zonaId: Number(this.zona),
            especialidadIds: [Number(this.especialidad)]
          }))
        )
      : registro$;

    flujo$.subscribe({
      next: () => {
        this.enviando = false;
        this.registroValido = true;
        void this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.enviando = false;
        this.mensaje = mensajeDeError(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.');
      }
    });
  }
}