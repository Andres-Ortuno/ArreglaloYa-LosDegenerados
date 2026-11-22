/** Reglas de sanciones (RN-07, RF-20, RF-35), sin base de datos para poder probarlas solas. */

/** Escalera de suspensión en horas: serie de Fibonacci (RN-07). */
export const ESCALA_HORAS = [1, 2, 3, 5, 8, 13] as const;

/**
 * Horas de suspensión según cuántas suspensiones tuvo antes el trabajador.
 * 0 previas => 1 h, 1 => 2 h, ... y desde la sexta se queda en 13 h.
 * [CONFIRMAR con el docente qué ocurre después de 13 h: hoy se repite 13 h]
 */
export function horasDeSuspension(suspensionesPrevias: number): number {
  const indice = Math.min(Math.max(0, suspensionesPrevias), ESCALA_HORAS.length - 1);
  return ESCALA_HORAS[indice];
}

/** RF-35: sanción global cuando MÁS de 10 clientes distintos reportan estafa. [CONFIRMAR si deben ser distintos] */
export const UMBRAL_ESTAFA_GLOBAL = 10;

export function aplicaSancionGlobal(clientesDistintosConEstafa: number): boolean {
  return clientesDistintosConEstafa > UMBRAL_ESTAFA_GLOBAL;
}
