/**
 * Consultas SQL de calificaciones y reportes (RF-18, RF-19, RF-32).
 * Tablas del script: calificacion, reporte, pedido, administrador, notificacion.
 * El promedio de estrellas del trabajador NO se guarda: lo calcula la vista v_trabajador_publico
 * cada vez, así que siempre está al día.
 */

export const SQL_PEDIDO = `
  SELECT id, estado, cliente_id AS "clienteId", trabajador_id AS "trabajadorId"
    FROM pedido WHERE id = $1`;

// ---------------------------------------------------------------- calificaciones
export const SQL_YA_CALIFICO = `SELECT 1 FROM calificacion WHERE pedido_id = $1 AND direccion = $2::direccion_calif`;

/** El trigger tg_validar_calificacion revisa que el pedido esté finalizado y que autor y destinatario sean las partes. */
export const SQL_INSERT_CALIFICACION = `
  INSERT INTO calificacion (pedido_id, direccion, autor_id, destinatario_id, estrellas, comentario)
       VALUES ($1, $2::direccion_calif, $3, $4, $5, $6)
    RETURNING id, direccion, estrellas, comentario, creada_en AS "creadaEn"`;

/**
 * RN-12: la calificación del trabajador al cliente nunca se muestra al cliente.
 * $2 = true solo cuando quien consulta es el trabajador.
 */
export const SQL_CALIFICACIONES_DE_PEDIDO = `
  SELECT id, direccion, estrellas, comentario, creada_en AS "creadaEn"
    FROM calificacion
   WHERE pedido_id = $1 AND ($2::boolean OR direccion = 'cliente_a_trabajador')
   ORDER BY id`;

/** Opiniones públicas de un trabajador (RF-07): solo las de clientes, con el nombre abreviado. */
export const SQL_OPINIONES_DE_TRABAJADOR = `
  SELECT k.estrellas, k.comentario, k.creada_en AS "creadaEn",
         regexp_replace(c.nombre, '^(\\S+)\\s+(\\S).*$', '\\1 \\2.') AS cliente
    FROM calificacion k
    JOIN cuenta c ON c.id = k.autor_id
   WHERE k.destinatario_id = $1 AND k.direccion = 'cliente_a_trabajador'
   ORDER BY k.creada_en DESC, k.id DESC
   LIMIT $2 OFFSET $3`;

export const SQL_RESUMEN_TRABAJADOR = `
  SELECT cuenta_id AS "trabajadorId", nombre, calificacion_promedio AS "calificacionPromedio",
         cantidad_opiniones AS "cantidadOpiniones"
    FROM v_trabajador_publico WHERE cuenta_id = $1`;

// ---------------------------------------------------------------- reportes
export const SQL_YA_REPORTO = `SELECT 1 FROM reporte WHERE pedido_id = $1 AND cliente_id = $2`;

export const SQL_INSERT_REPORTE = `
  INSERT INTO reporte (pedido_id, cliente_id, trabajador_id, tipo, descripcion)
       VALUES ($1, $2, $3, $4::tipo_reporte, $5)
    RETURNING id, pedido_id AS "pedidoId", tipo, descripcion, estado, creado_en AS "creadoEn"`;

export const SQL_MIS_REPORTES = `
  SELECT r.id, r.pedido_id AS "pedidoId", r.tipo, r.descripcion, r.estado, r.creado_en AS "creadoEn",
         r.validado_en AS "validadoEn", ct.nombre AS trabajador
    FROM reporte r JOIN cuenta ct ON ct.id = r.trabajador_id
   WHERE r.cliente_id = $1
   ORDER BY r.id DESC`;

/** Avisa a todos los administradores que hay un reporte por revisar (RF-20, RF-35 se aplican al validarlo). */
export const SQL_NOTIFICAR_ADMINS = `
  INSERT INTO notificacion (cuenta_id, pedido_id, mensaje)
       SELECT cuenta_id, $1, $2 FROM administrador`;
