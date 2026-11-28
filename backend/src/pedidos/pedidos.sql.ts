/**
 * Consultas SQL del módulo de pedidos (CU-05, CU-07, CU-08).
 * Usan las tablas del script del grupo: pedido, pago, cambio_monto, postulacion, notificacion, configuracion.
 * Los triggers del script ya validan las transiciones de estado (RF-13) y escriben la bitácora (RF-22).
 * Van aquí, sin ${...}, para leerlas y probarlas en pgAdmin tal cual.
 */

/** Guarda quién hace el cambio, para que los triggers lo anoten en la bitácora (solo dura la transacción). */
export const SQL_SET_USUARIO = `SELECT set_config('app.usuario_id', $1::text, true)`;

export const SQL_CONFIGURACION = `SELECT clave, valor FROM configuracion`;

// ---------------------------------------------------------------- consultas
export const SQL_MIS_PEDIDOS = `
  SELECT p.id, p.estado, p.monto_vigente AS "montoVigente",
         p.horario_inicio AS "horarioInicio", p.horario_fin AS "horarioFin",
         CASE WHEN p.cliente_id = $1 THEN 'cliente' ELSE 'trabajador' END AS "miRol",
         CASE WHEN p.cliente_id = $1 THEN ct.nombre ELSE cc.nombre END   AS "contraparte",
         e.nombre AS especialidad, z.nombre AS zona, s.descripcion, po.tipo_trabajo AS "tipoTrabajo",
         p.creado_en AS "creadoEn"
    FROM pedido p
    JOIN solicitud s    ON s.id = p.solicitud_id
    JOIN postulacion po ON po.id = p.postulacion_id
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
    JOIN cuenta cc      ON cc.id = p.cliente_id
    JOIN cuenta ct      ON ct.id = p.trabajador_id
   WHERE p.cliente_id = $1 OR p.trabajador_id = $1
   ORDER BY p.creado_en DESC`;

/** Detalle para las dos partes (RF-09). Nunca incluye teléfono ni documentos de la otra parte. */
export const SQL_PEDIDO_DETALLE = `
  SELECT p.id, p.estado, p.monto_vigente AS "montoVigente",
         p.horario_inicio AS "horarioInicio", p.horario_fin AS "horarioFin",
         p.comision_monto AS "comisionMonto", p.motivo_cancelacion AS "motivoCancelacion",
         p.cliente_id AS "clienteId", p.trabajador_id AS "trabajadorId",
         cc.nombre AS cliente, ct.nombre AS trabajador,
         s.id AS "solicitudId", s.descripcion, s.ubicacion, e.nombre AS especialidad, z.nombre AS zona,
         po.tipo_trabajo AS "tipoTrabajo", po.costo_visita AS "costoVisita",
         po.incluye_materiales AS "incluyeMateriales",
         t.anticipo_minimo AS "anticipoMinimo", t.qr_pago_url AS "qrPagoUrl"
    FROM pedido p
    JOIN solicitud s    ON s.id = p.solicitud_id
    JOIN postulacion po ON po.id = p.postulacion_id
    JOIN trabajador t   ON t.cuenta_id = p.trabajador_id
    JOIN especialidad e ON e.id = s.especialidad_id
    JOIN zona z         ON z.id = s.zona_id
    JOIN cuenta cc      ON cc.id = p.cliente_id
    JOIN cuenta ct      ON ct.id = p.trabajador_id
   WHERE p.id = $1`;

export const SQL_PAGOS_DE_PEDIDO = `
  SELECT id, tipo, monto, medio, estado,
         monto_liberado AS "montoLiberado", monto_reembolsado AS "montoReembolsado",
         pagado_en AS "pagadoEn", liberado_en AS "liberadoEn"
    FROM pago WHERE pedido_id = $1 ORDER BY id`;

export const SQL_CAMBIOS_DE_PEDIDO = `
  SELECT id, monto_anterior AS "montoAnterior", monto_nuevo AS "montoNuevo", motivo, estado,
         creado_en AS "creadoEn", respondido_en AS "respondidoEn"
    FROM cambio_monto WHERE pedido_id = $1 ORDER BY id`;

/** RF-22: historial cronológico de estados y responsable de cada cambio. */
export const SQL_HISTORIAL_ESTADOS = `
  SELECT b.valor_anterior AS "estadoAnterior",
         b.valor_nuevo AS "estadoNuevo",
         b.usuario_id AS "responsableId",
         COALESCE(c.nombre, 'Sistema') AS responsable,
         b.fecha AS "fechaCambio"
    FROM bitacora b
    LEFT JOIN cuenta c ON c.id = b.usuario_id
   WHERE b.pedido_id = $1
     AND b.entidad = 'pedido'
     AND b.campo = 'estado'
   ORDER BY b.fecha ASC, b.id ASC`;

// ---------------------------------------------------------------- bloqueo para cambiar un pedido
/**
 * FOR UPDATE: si dos personas actúan a la vez sobre el mismo pedido, la segunda espera y luego ve el
 * estado ya cambiado. "horarioVencido" = ya pasó la hora de inicio más el margen del trabajador.
 */
export const SQL_BLOQUEAR_PEDIDO = `
  SELECT p.id, p.estado, p.cliente_id AS "clienteId", p.trabajador_id AS "trabajadorId",
         p.monto_vigente AS "montoVigente",
         ((now() AT TIME ZONE 'America/La_Paz') > p.horario_inicio + make_interval(mins => p.margen_minutos))
           AS "horarioVencido",
         po.tipo_trabajo AS "tipoTrabajo", po.costo_visita AS "costoVisita",
         t.anticipo_minimo AS "anticipoMinimo"
    FROM pedido p
    JOIN postulacion po ON po.id = p.postulacion_id
    JOIN trabajador t   ON t.cuenta_id = p.trabajador_id
   WHERE p.id = $1
     FOR UPDATE OF p`;

// ---------------------------------------------------------------- pagos
export const SQL_HAY_ANTICIPO = `SELECT 1 FROM pago WHERE pedido_id = $1 AND tipo = 'anticipo' AND estado <> 'reembolsado'`;

export const SQL_INSERT_PAGO = `
  INSERT INTO pago (pedido_id, tipo, monto, medio, referencia_externa)
       VALUES ($1, $2::tipo_pago, $3::numeric, $4::medio_pago, $5)
    RETURNING id, tipo, monto, medio, estado, pagado_en AS "pagadoEn"`;

/** Lo que el cliente ya aportó y sigue vigente (retenido o liberado). Sirve para calcular el saldo. */
export const SQL_TOTAL_APORTADO = `
  SELECT COALESCE(sum(monto) FILTER (WHERE estado IN ('retenido', 'liberado', 'liberado_parcial')), 0) AS aportado
    FROM pago WHERE pedido_id = $1`;

export const SQL_PAGOS_RETENIDOS = `SELECT id, monto FROM pago WHERE pedido_id = $1 AND estado = 'retenido' ORDER BY id`;

/** RF-12: el pago retenido pasa al trabajador. */
export const SQL_LIBERAR_PAGOS = `
  UPDATE pago
     SET estado = 'liberado', monto_liberado = monto - monto_reembolsado, liberado_en = now()
   WHERE pedido_id = $1 AND estado = 'retenido'
RETURNING monto_liberado AS "montoLiberado"`;

/** RF-29 / RF-31: reparte un pago retenido entre trabajador y cliente. */
export const SQL_REPARTIR_PAGO = `
  UPDATE pago
     SET estado = $4::estado_pago, monto_liberado = $2::numeric, monto_reembolsado = $3::numeric,
         liberado_en = CASE WHEN $2::numeric > 0 THEN now() ELSE liberado_en END
   WHERE id = $1`;

// ---------------------------------------------------------------- estado del pedido
export const SQL_CAMBIAR_ESTADO = `
  UPDATE pedido SET estado = $2::estado_pedido, motivo_cancelacion = COALESCE($3, motivo_cancelacion)
   WHERE id = $1
RETURNING id, estado`;

export const SQL_FINALIZAR = `
  UPDATE pedido SET estado = 'finalizado', comision_monto = $2::numeric
   WHERE id = $1
RETURNING id, estado, comision_monto AS "comisionMonto"`;

export const SQL_ACTUALIZAR_MONTO = `UPDATE pedido SET monto_vigente = $2::numeric WHERE id = $1`;

// ---------------------------------------------------------------- cambio de monto (RF-27)
export const SQL_CAMBIO_PENDIENTE = `SELECT id FROM cambio_monto WHERE pedido_id = $1 AND estado = 'pendiente'`;

export const SQL_INSERT_CAMBIO = `
  INSERT INTO cambio_monto (pedido_id, monto_anterior, monto_nuevo, motivo, autor_id)
       VALUES ($1, $2::numeric, $3::numeric, $4, $5)
    RETURNING id, monto_anterior AS "montoAnterior", monto_nuevo AS "montoNuevo", motivo, estado, creado_en AS "creadoEn"`;

export const SQL_CAMBIO_A_RESPONDER = `
  SELECT id, monto_nuevo AS "montoNuevo" FROM cambio_monto
   WHERE id = $1 AND pedido_id = $2 AND estado = 'pendiente' FOR UPDATE`;

export const SQL_RESPONDER_CAMBIO = `
  UPDATE cambio_monto SET estado = $2::estado_cambio_monto, respondido_en = now() WHERE id = $1`;

// ---------------------------------------------------------------- avisos (RF-17)
/** Queda en "notificacion" (enviada = false) hasta que exista el envío por WhatsApp. */
export const SQL_NOTIFICAR = `INSERT INTO notificacion (cuenta_id, pedido_id, mensaje) VALUES ($1, $2, $3)`;
