import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, finalize, of, shareReplay, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';

export type Rol = 'visitante' | 'cliente' | 'trabajador' | 'administrador';

/** Lo que devuelve el backend en /auth/login, /auth/registro y /auth/me. */
export interface Cuenta {
  id: number;
  nombre: string;
  correo: string;
  telefonoWhatsapp: string;
  tipoCuenta: 'persona' | 'empresa';
  esCliente: boolean;
  esTrabajador: boolean;
  esAdministrador: boolean;
}

interface RespuestaSesion {
  accessToken: string;
  cuenta: Cuenta;
}

export interface DatosRegistro {
  tipoCuenta: 'persona' | 'empresa';
  rol: 'cliente' | 'trabajador';
  nombre: string;
  telefonoWhatsapp: string;
  razonSocial?: string;
  correo: string;
  password: string;
}

const CLAVE_TOKEN = 'arreglaloya.token';
const CLAVE_ROL = 'arreglaloya.rol';

/**
 * Sesión real: guarda el token del backend y los datos de la cuenta.
 * Reemplaza a SesionDemoService (que solo simulaba un rol).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly enNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _token = signal<string | null>(null);
  private readonly _cuenta = signal<Cuenta | null>(null);
  private readonly _rolElegido = signal<Rol | null>(null);
  private cargaEnCurso: Observable<Cuenta> | null = null;

  readonly cuenta = this._cuenta.asReadonly();
  readonly hayToken = computed(() => this._token() !== null);

  /** Roles que esta cuenta puede usar (una cuenta puede ser cliente y trabajador, RN-01). */
  readonly rolesDisponibles = computed<Rol[]>(() => {
    const c = this._cuenta();
    if (!c) return ['visitante'];
    const roles: Rol[] = [];
    if (c.esCliente) roles.push('cliente');
    if (c.esTrabajador) roles.push('trabajador');
    if (c.esAdministrador) roles.push('administrador');
    return roles.length ? roles : ['visitante'];
  });

  /** El rol con el que se usa la aplicación ahora. Mismo nombre que en SesionDemoService. */
  readonly rolActual = computed<Rol>(() => {
    const elegido = this._rolElegido();
    const disponibles = this.rolesDisponibles();
    return elegido && disponibles.includes(elegido) ? elegido : disponibles[0];
  });

  constructor() {
    // Recupera la sesión al recargar la página (solo en el navegador).
    const token = this.leer(CLAVE_TOKEN);
    if (token) {
      this._token.set(token);
      this._rolElegido.set(this.leer(CLAVE_ROL) as Rol | null);
      this.asegurarCuenta().subscribe({ error: () => this.limpiar() }); // token vencido o inválido
    }
  }

  token(): string | null {
    return this._token();
  }

  ingresar(correo: string, password: string): Observable<RespuestaSesion> {
    return this.http
      .post<RespuestaSesion>(`${API_BASE_URL}/auth/login`, { correo, password })
      .pipe(tap((r) => this.guardarSesion(r)));
  }

  registrar(datos: DatosRegistro): Observable<RespuestaSesion> {
    return this.http
      .post<RespuestaSesion>(`${API_BASE_URL}/auth/registro`, datos)
      .pipe(tap((r) => this.guardarSesion(r)));
  }

  /** Devuelve la cuenta; si todavía no se cargó (p. ej. al recargar la página) la pide una sola vez. */
  asegurarCuenta(): Observable<Cuenta> {
    const actual = this._cuenta();
    if (actual) return of(actual);
    if (!this.cargaEnCurso) {
      this.cargaEnCurso = this.http.get<Cuenta>(`${API_BASE_URL}/auth/me`).pipe(
        tap((c) => this._cuenta.set(c)),
        finalize(() => (this.cargaEnCurso = null)),
        shareReplay(1),
      );
    }
    return this.cargaEnCurso;
  }

  /** Para cuentas con más de un rol: cambia entre cliente y trabajador. */
  cambiarRol(rol: Rol): void {
    if (!this.rolesDisponibles().includes(rol)) return;
    this._rolElegido.set(rol);
    this.guardar(CLAVE_ROL, rol);
  }

  salir(): void {
    this.limpiar();
    void this.router.navigateByUrl('/ingresar');
  }

  /** El interceptor la llama cuando el backend responde 401 (token vencido). */
  sesionVencida(): void {
    if (this._token()) this.salir();
  }

  private guardarSesion(r: RespuestaSesion): void {
    this._token.set(r.accessToken);
    this._cuenta.set(r.cuenta);
    this._rolElegido.set(null);
    this.guardar(CLAVE_TOKEN, r.accessToken);
    try {
      if (this.enNavegador) localStorage.removeItem(CLAVE_ROL);
    } catch {
      /* sin almacenamiento disponible: la sesión sigue funcionando en memoria */
    }
  }

  private limpiar(): void {
    this._token.set(null);
    this._cuenta.set(null);
    this._rolElegido.set(null);
    try {
      if (this.enNavegador) {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_ROL);
      }
    } catch {
      /* nada que limpiar */
    }
  }

  // localStorage puede no existir (servidor) o fallar (modo privado): siempre con try/catch.
  private leer(clave: string): string | null {
    try {
      return this.enNavegador ? localStorage.getItem(clave) : null;
    } catch {
      return null;
    }
  }

  private guardar(clave: string, valor: string): void {
    try {
      if (this.enNavegador) localStorage.setItem(clave, valor);
    } catch {
      /* la sesión vive solo en memoria */
    }
  }
}
