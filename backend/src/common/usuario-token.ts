/** Datos del usuario que vienen dentro del token JWT. */
export interface UsuarioToken {
  /** cuenta.id (número, como en la base de datos) */
  id: number;
  correo: string;
}
