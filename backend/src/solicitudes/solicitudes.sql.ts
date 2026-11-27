/**
 * Consultas SQL del módulo de solicitudes y postulaciones. Usan las tablas del script del grupo:
 * solicitud, solicitud_foto, solicitud_horario, postulacion, pedido, notificacion, bitacora.
 * Van aquí, sin ${...}, para leerlas y probarlas en pgAdmin tal cual.
 */

// ---------------------------------------------------------------- roles
export const SQL_ES_CLIENTE = `SELECT 1 FROM cliente WHERE cuenta_id = $1`;

/** Un trabajador solo actúa si está Activo, sin bloqueo permanente ni suspensión vigente (RF-08, RF-20, RF-21). */
export const SQL_TRABAJADOR_ACTIVO = `
  SELECT t.cuenta_id AS id, t.zona_id AS "zonaId"
    FROM trabajador t
   WHERE t.cuenta_id = $1
     AND t.estado = 'activo'
     AND NOT t.bloqueado_permanente
     AND (t.suspendido_hasta IS NULL OR t.suspendido_hasta <= now())
     AND (SELECT count(DISTINCT d.tipo) FROM documento d
           WHERE d.trabajador_id = t.cuenta_id AND d.estado = 'aprobado') = 3`;

// ---------------------------------------------------------------- crear solicitud (RF-05, RF-06, RF-16)
export const SQL_VALIDAR_HORARIOS = `
  SELECT count(*) FILTER (WHERE x.fin <= x.inicio)                                AS invertidos,
         count(*) FILTER (WHERE x.inicio <= (now() AT TIME ZONE 'America/La_Paz')) AS pasados
    FROM unnest($1::timestamp[], $2::timestamp[]) AS x(inicio, fin)`;

export const SQL_INSERT_SOLICITUD = `
  INSERT INTO solicitud (cliente_id, especialidad_id, zona_id, descripcion, ubicacion, latitud, longitud)
       VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric)
    RETURNING id, estado, creada_en AS "creadaEn", vence_en AS "venceEn"`;

export const SQL_INSERT_FOTOS = `
  INSERT INTO solicitud_foto (solicitud_id, url) SELECT $1, unnest($2::text[])`;

export const SQL_INSERT_HORARIOS = `
  INSERT INTO solicitud_horario (solicitud_id, inicio, fin)
       SELECT $1, h.inicio, h.fin FROM unnest($2::timestamp[], $3::timestamp[]) AS h(inicio, fin)`;

/** RF-16: ¿hay trabajadores Activos con esa especialidad y zona? */
export const SQL_HAY_TRABAJADORES = `
  SELECT EXISTS (
           SELECT 1
             FROM trabajador t
             JOIN trabajador_especialidad te ON te.trabajador_id = t.cuenta_id
            WHERE t.estado = 'activo' AND NOT t.bloqueado_permanente
              AND (t.suspendido_hasta IS NULL OR t.suspendido_hasta <= now())
              AND (SELECT count(DISTINCT d.tipo) FROM documento d
                     WHERE d.trabajador_id = t.cuenta_id AND d.estado = 'aprobado') = 3
              AND t.zona_id = $1 AND te.especialidad_id = $2 AND t.cuenta_id <> $3) AS hay`;

// ---------------------------------------------------------------- consultas del cliente
export const SQL_MIS_SOLICITUDES = `
  SELECT s.id, s.descripcion, s.ubicacion, s.estado,
         s.creada_en AS "creadaEn", s.vence_en AS "venceEn",
         e.nombre AS especialidad, z.nombre AS zona,
         (SELECT count(*) FROM postulacion p
           WHERE p.solicitud_id = s.id AND p.estado <> 'descartada') AS "cantidadPostulaciones",
         (SELECT pe.id FROM pedido pe WHERE pe.solicitud_id = s.id) AS "pedidoId"
    FROM solicitud s
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
   WHERE s.cliente_id = $1
   ORDER BY s.creada_en DESC`;

export const SQL_SOLICITUD_DETALLE = `
  SELECT s.id, s.cliente_id AS "clienteId", s.descripcion, s.ubicacion, s.latitud, s.longitud, s.estado,
         s.creada_en AS "creadaEn", s.vence_en AS "venceEn",
         e.nombre AS especialidad, z.nombre AS zona,
         COALESCE((SELECT json_agg(f.url ORDER BY f.id)
                     FROM solicitud_foto f WHERE f.solicitud_id = s.id), '[]'::json) AS fotos,
         COALESCE((SELECT json_agg(json_build_object('id', h.id, 'inicio', h.inicio, 'fin', h.fin) ORDER BY h.inicio)
                     FROM solicitud_horario h WHERE h.solicitud_id = s.id), '[]'::json) AS horarios,
         (SELECT pe.id FROM pedido pe WHERE pe.solicitud_id = s.id) AS "pedidoId"
    FROM solicitud s
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
   WHERE s.id = $1`;

/** Lo que el cliente ve de cada postulación (RF-09, HU-02): monto, tipo, visita, materiales y reputación. Nunca documentos ni teléfono. */
export const SQL_POSTULACIONES_DE_SOLICITUD = `
  SELECT p.id, p.trabajador_id AS "trabajadorId", c.nombre AS trabajador, z.nombre AS zona,
         p.monto, p.tipo_trabajo AS "tipoTrabajo", p.costo_visita AS "costoVisita",
         p.incluye_materiales AS "incluyeMateriales", p.estado, p.creada_en AS "creadaEn",
         COALESCE(r.calificacion_promedio, 0) AS "calificacionPromedio",
         COALESCE(r.cantidad_opiniones, 0)    AS "cantidadOpiniones"
    FROM postulacion p
    JOIN cuenta c     ON c.id = p.trabajador_id
    JOIN trabajador t ON t.cuenta_id = p.trabajador_id
    JOIN zona z       ON z.id = t.zona_id
    LEFT JOIN v_trabajador_publico r ON r.cuenta_id = p.trabajador_id
   WHERE p.solicitud_id = $1
   ORDER BY p.creada_en`;

// ---------------------------------------------------------------- consultas del trabajador (CU-04, RF-16)
/** Solicitudes pendientes de su zona y especialidad, la más antigua primero (cola por antigüedad). */
export const SQL_DISPONIBLES = `
  SELECT s.id, e.nombre AS especialidad, z.nombre AS zona, s.descripcion, s.ubicacion,
         s.creada_en AS "creadaEn", s.vence_en AS "venceEn",
         COALESCE((SELECT json_agg(f.url ORDER BY f.id)
                     FROM solicitud_foto f WHERE f.solicitud_id = s.id), '[]'::json) AS fotos,
         COALESCE((SELECT json_agg(json_build_object('id', h.id, 'inicio', h.inicio, 'fin', h.fin) ORDER BY h.inicio)
                     FROM solicitud_horario h WHERE h.solicitud_id = s.id), '[]'::json) AS horarios,
         EXISTS (SELECT 1 FROM postulacion p
                  WHERE p.solicitud_id = s.id AND p.trabajador_id = t.cuenta_id) AS "yaPostulado"
    FROM trabajador t
    JOIN solicitud s    ON s.zona_id = t.zona_id AND s.estado = 'pendiente'
                       AND s.vence_en > now() AND s.cliente_id <> t.cuenta_id
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
   WHERE t.cuenta_id = $1
     AND EXISTS (SELECT 1 FROM trabajador_especialidad te
                  WHERE te.trabajador_id = t.cuenta_id AND te.especialidad_id = s.especialidad_id)
   ORDER BY s.creada_en ASC`;

export const SQL_MIS_POSTULACIONES = `
  SELECT p.id, p.solicitud_id AS "solicitudId", p.monto, p.tipo_trabajo AS "tipoTrabajo",
         p.costo_visita AS "costoVisita", p.incluye_materiales AS "incluyeMateriales",
         p.estado, p.creada_en AS "creadaEn",
         s.descripcion, e.nombre AS especialidad, z.nombre AS zona, s.estado AS "estadoSolicitud",
         (SELECT pe.id FROM pedido pe WHERE pe.postulacion_id = p.id) AS "pedidoId"
    FROM postulacion p
    JOIN solicitud s    ON s.id = p.solicitud_id
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
   WHERE p.trabajador_id = $1
   ORDER BY p.creada_en DESC`;

// ---------------------------------------------------------------- postularse (RF-08)
export const SQL_SOLICITUD_PARA_POSTULAR = `
  SELECT s.id, s.cliente_id AS "clienteId", s.estado, s.zona_id AS "zonaId",
         s.especialidad_id AS "especialidadId", (s.vence_en <= now()) AS vencida
    FROM solicitud s WHERE s.id = $1`;

export const SQL_TIENE_ESPECIALIDAD = `
  SELECT 1 FROM trabajador_especialidad WHERE trabajador_id = $1 AND especialidad_id = $2`;

export const SQL_INSERT_POSTULACION = `
  INSERT INTO postulacion (solicitud_id, trabajador_id, monto, tipo_trabajo, costo_visita, incluye_materiales)
       VALUES ($1, $2, $3::numeric, $4::tipo_trabajo, $5::numeric, $6::boolean)
    RETURNING id, estado, creada_en AS "creadaEn"`;

/** RF-17: queda en la tabla "notificacion" (enviada = false) hasta que exista el envío por WhatsApp. */
export const SQL_NOTIFICAR_POSTULACION = `
  INSERT INTO notificacion (cuenta_id, mensaje)
       SELECT s.cliente_id, 'Nueva postulación de ' || c.nombre || ' en tu solicitud #' || s.id
         FROM solicitud s, cuenta c
        WHERE s.id = $1 AND c.id = $2`;

// ---------------------------------------------------------------- elegir postulación (RF-25)
export const SQL_BLOQUEAR_SOLICITUD = `
  SELECT id, cliente_id AS "clienteId", estado FROM solicitud WHERE id = $1 FOR UPDATE`;

export const SQL_POSTULACION_A_ELEGIR = `
  SELECT p.id, p.trabajador_id AS "trabajadorId", p.monto,
         t.margen_minutos AS "margenMinutos",
         (t.estado = 'activo' AND NOT t.bloqueado_permanente
            AND (t.suspendido_hasta IS NULL OR t.suspendido_hasta <= now())
            AND (SELECT count(DISTINCT d.tipo) FROM documento d
                   WHERE d.trabajador_id = t.cuenta_id AND d.estado = 'aprobado') = 3) AS "disponible"
    FROM postulacion p
    JOIN trabajador t ON t.cuenta_id = p.trabajador_id
   WHERE p.id = $1 AND p.solicitud_id = $2 AND p.estado = 'enviada'`;

export const SQL_HORARIO_DE_SOLICITUD = `
  SELECT id, inicio, fin FROM solicitud_horario WHERE id = $1 AND solicitud_id = $2`;

/** El pedido nace «Bajo revisión» (estado por defecto de la tabla, RF-25). */
export const SQL_INSERT_PEDIDO = `
  INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id,
                      monto_vigente, horario_inicio, horario_fin, margen_minutos)
       SELECT $1, $2, s.cliente_id, $3, $4::numeric, h.inicio, h.fin, $5::smallint
         FROM solicitud s, solicitud_horario h
        WHERE s.id = $1 AND h.id = $6
    RETURNING id, estado, monto_vigente AS "montoVigente",
              horario_inicio AS "horarioInicio", horario_fin AS "horarioFin"`;

export const SQL_MARCAR_POSTULACIONES = `
  UPDATE postulacion
     SET estado = CASE WHEN id = $2 THEN 'elegida'::estado_postulacion ELSE 'descartada'::estado_postulacion END
   WHERE solicitud_id = $1 AND estado = 'enviada'`;

export const SQL_SOLICITUD_ASIGNADA = `UPDATE solicitud SET estado = 'asignada' WHERE id = $1`;

/** RF-22: el INSERT del pedido no pasa por el trigger de transición, así que se registra aquí. */
export const SQL_BITACORA_PEDIDO_NUEVO = `
  INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
       VALUES ($1, 'pedido', $1, 'estado', NULL, 'bajo_revision', $2)`;

export const SQL_NOTIFICAR_ELECCION = `
  INSERT INTO notificacion (cuenta_id, pedido_id, mensaje)
       SELECT p.trabajador_id,
              CASE WHEN p.id = $2 THEN $3::int END,
              CASE WHEN p.id = $2
                   THEN 'Fuiste elegido para la solicitud #' || p.solicitud_id || '. Pedido #' || $3::int
                   ELSE 'La solicitud #' || p.solicitud_id || ' fue asignada a otro trabajador' END
         FROM postulacion p
        WHERE p.solicitud_id = $1`;

// ---------------------------------------------------------------- cancelar solicitud / vencimiento (RF-24)
export const SQL_CANCELAR_SOLICITUD = `UPDATE solicitud SET estado = 'cancelada' WHERE id = $1`;

export const SQL_DESCARTAR_POSTULACIONES = `
  UPDATE postulacion SET estado = 'descartada' WHERE solicitud_id = $1 AND estado = 'enviada'`;

/** RF-24: a los 30 días sin aceptación la solicitud pasa a «cancelada» (no se borra) y se avisa al cliente. */
export const SQL_ANULAR_VENCIDAS = `
  WITH vencidas AS (
         UPDATE solicitud SET estado = 'cancelada'
          WHERE estado = 'pendiente' AND vence_en <= now()
      RETURNING id, cliente_id)
  INSERT INTO notificacion (cuenta_id, mensaje)
       SELECT cliente_id, 'Tu solicitud #' || id || ' venció a los 30 días sin aceptación y fue cancelada'
         FROM vencidas
    RETURNING id`;
