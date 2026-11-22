/**
 * Consultas SQL del panel del administrador (CU-10, CU-11, RF-04, RF-20, RF-21, RF-23, RF-34, RF-35).
 * Tablas del script: trabajador, documento, reporte, sancion, bitacora, notificacion y la vista v_flujo_economico.
 */

// ================================================================ documentos (CU-10)
export const SQL_TRABAJADORES_POR_ESTADO = `
  SELECT t.cuenta_id AS id, c.nombre, c.correo, z.nombre AS zona, t.estado,
         t.bloqueado_permanente AS "bloqueadoPermanente", t.suspendido_hasta AS "suspendidoHasta",
         count(d.id)                                 AS subidos,
         count(d.id) FILTER (WHERE d.estado = 'aprobado')  AS aprobados,
         count(d.id) FILTER (WHERE d.estado = 'pendiente') AS pendientes,
         count(d.id) FILTER (WHERE d.estado = 'rechazado') AS rechazados
    FROM trabajador t
    JOIN cuenta c ON c.id = t.cuenta_id
    JOIN zona z   ON z.id = t.zona_id
    LEFT JOIN documento d ON d.trabajador_id = t.cuenta_id
   WHERE t.estado = $1::estado_trabajador
   GROUP BY t.cuenta_id, c.nombre, c.correo, z.nombre, t.estado, t.bloqueado_permanente, t.suspendido_hasta
   ORDER BY t.creado_en`;

export const SQL_DOCUMENTOS_DE_TRABAJADOR = `
  SELECT id, tipo, estado, motivo_rechazo AS "motivoRechazo", subido_en AS "subidoEn", revisado_en AS "revisadoEn"
    FROM documento WHERE trabajador_id = $1 ORDER BY id`;

export const SQL_DOCUMENTO_ARCHIVO = `SELECT archivo_url AS "archivoUrl" FROM documento WHERE id = $1`;

export const SQL_DOCUMENTO_BLOQUEAR = `
  SELECT id, trabajador_id AS "trabajadorId", tipo, estado FROM documento WHERE id = $1 FOR UPDATE`;

export const SQL_APROBAR_DOCUMENTO = `
  UPDATE documento SET estado = 'aprobado', motivo_rechazo = NULL, revisado_por = $2, revisado_en = now() WHERE id = $1`;

export const SQL_RECHAZAR_DOCUMENTO = `
  UPDATE documento SET estado = 'rechazado', motivo_rechazo = $3, revisado_por = $2, revisado_en = now() WHERE id = $1`;

/** Faltan documentos si no están los 3 tipos aprobados. */
export const SQL_DOCUMENTOS_APROBADOS = `
  SELECT count(DISTINCT tipo) AS aprobados FROM documento WHERE trabajador_id = $1 AND estado = 'aprobado'`;

/** RF-04: con los 3 aprobados la cuenta pasa de «En revisión» a «Activo». Un bloqueado no se activa. */
export const SQL_ACTIVAR_TRABAJADOR = `
  UPDATE trabajador SET estado = 'activo'
   WHERE cuenta_id = $1 AND estado = 'en_revision' AND NOT bloqueado_permanente
RETURNING cuenta_id`;

// ================================================================ reportes y sanciones (CU-11)
export const SQL_REPORTES_POR_ESTADO = `
  SELECT r.id, r.pedido_id AS "pedidoId", r.tipo, r.descripcion, r.estado, r.creado_en AS "creadoEn",
         r.validado_en AS "validadoEn",
         cc.nombre AS cliente, ct.nombre AS trabajador, r.trabajador_id AS "trabajadorId"
    FROM reporte r
    JOIN cuenta cc ON cc.id = r.cliente_id
    JOIN cuenta ct ON ct.id = r.trabajador_id
   WHERE r.estado = $1::estado_reporte
   ORDER BY r.creado_en`;

export const SQL_REPORTE_BLOQUEAR = `
  SELECT id, pedido_id AS "pedidoId", cliente_id AS "clienteId", trabajador_id AS "trabajadorId", tipo, estado
    FROM reporte WHERE id = $1 FOR UPDATE`;

export const SQL_VALIDAR_REPORTE = `UPDATE reporte SET estado = 'valido', validado_por = $2, validado_en = now() WHERE id = $1`;
export const SQL_RECHAZAR_REPORTE = `UPDATE reporte SET estado = 'rechazado', validado_por = $2, validado_en = now() WHERE id = $1`;

export const SQL_SUSPENSIONES_PREVIAS = `SELECT count(*) AS total FROM sancion WHERE cuenta_id = $1 AND tipo = 'suspension'`;

/** Clientes distintos con un reporte de estafa válido contra el trabajador (RF-35). */
export const SQL_ESTAFAS_DISTINTAS = `
  SELECT count(DISTINCT cliente_id) AS total FROM reporte
   WHERE trabajador_id = $1 AND tipo = 'estafa' AND estado = 'valido'`;

/** "fin" se calcula en la base con now(), que vale lo mismo durante toda la transacción. */
export const SQL_INSERT_SANCION = `
  INSERT INTO sancion (cuenta_id, tipo, motivo, reporte_id, horas, fin, denuncia_policial, aplicada_por)
       VALUES ($1, $2::tipo_sancion, $3, $4, $5::smallint,
               CASE WHEN $5::smallint IS NULL THEN NULL ELSE now() + make_interval(hours => $5::int) END, $6, $7)
    RETURNING id, tipo, horas, inicio, fin`;

/** RF-20: durante la suspensión no recibe pedidos. El estado pasa a «Suspendido» hasta que venza. */
export const SQL_SUSPENDER_TRABAJADOR = `
  UPDATE trabajador
     SET estado = 'suspendido',
         suspendido_hasta = GREATEST(COALESCE(suspendido_hasta, now()), now() + make_interval(hours => $2::int))
   WHERE cuenta_id = $1`;

/** RF-35: la sanción global suspende la cuenta completa (no puede ni iniciar sesión). */
export const SQL_SUSPENDER_CUENTA = `
  UPDATE cuenta
     SET bloqueada_hasta = GREATEST(COALESCE(bloqueada_hasta, now()), now() + make_interval(hours => $2::int))
   WHERE id = $1`;

/** RF-21: bloqueo permanente. El número de documento queda registrado y no permite volver a registrarse. */
export const SQL_BLOQUEAR_TRABAJADOR = `
  UPDATE trabajador SET estado = 'suspendido', bloqueado_permanente = TRUE WHERE cuenta_id = $1`;

/** Termina las suspensiones que ya vencieron. Se ejecuta cada minuto desde el backend. */
export const SQL_REACTIVAR_VENCIDOS = `
  UPDATE trabajador SET estado = 'activo', suspendido_hasta = NULL
   WHERE estado = 'suspendido' AND NOT bloqueado_permanente
     AND suspendido_hasta IS NOT NULL AND suspendido_hasta <= now()
RETURNING cuenta_id`;

// ================================================================ historial y economía (RF-34, RF-23)
export const SQL_BITACORA_DE_PEDIDO = `
  SELECT b.id, b.entidad, b.entidad_id AS "entidadId", b.campo,
         b.valor_anterior AS "valorAnterior", b.valor_nuevo AS "valorNuevo", b.fecha, c.nombre AS usuario
    FROM bitacora b LEFT JOIN cuenta c ON c.id = b.usuario_id
   WHERE b.pedido_id = $1 ORDER BY b.id`;

export const SQL_PEDIDO_EXISTE = `SELECT 1 FROM pedido WHERE id = $1`;

export const SQL_FLUJO_ECONOMICO = `
  SELECT fecha::text AS fecha, total_pagado AS "totalPagado", retenido, liberado, reembolsado, comision
    FROM v_flujo_economico
   WHERE ($1::date IS NULL OR fecha >= $1::date) AND ($2::date IS NULL OR fecha <= $2::date)
   ORDER BY fecha`;

export const SQL_NOTIFICAR = `INSERT INTO notificacion (cuenta_id, pedido_id, mensaje) VALUES ($1, $2, $3)`;
export const SQL_SET_USUARIO = `SELECT set_config('app.usuario_id', $1::text, true)`;
