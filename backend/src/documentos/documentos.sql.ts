/** Consultas SQL de la subida de documentos del trabajador (RF-03). Tabla del script: documento. */

export const SQL_TRABAJADOR_EXISTE = `SELECT estado FROM trabajador WHERE cuenta_id = $1`;

export const SQL_DOCUMENTO_ACTUAL = `SELECT id, estado, archivo_url AS "archivoUrl" FROM documento WHERE trabajador_id = $1 AND tipo = $2::tipo_documento`;

/** Si ya existía un documento de ese tipo (rechazado o pendiente), se reemplaza y vuelve a revisión. */
export const SQL_GUARDAR_DOCUMENTO = `
  INSERT INTO documento (trabajador_id, tipo, archivo_url)
       VALUES ($1, $2::tipo_documento, $3)
  ON CONFLICT (trabajador_id, tipo) DO UPDATE
          SET archivo_url = EXCLUDED.archivo_url, estado = 'pendiente', motivo_rechazo = NULL,
              revisado_por = NULL, revisado_en = NULL, subido_en = now()
    RETURNING id, tipo, estado, subido_en AS "subidoEn"`;

export const SQL_MIS_DOCUMENTOS = `
  SELECT id, tipo, estado, motivo_rechazo AS "motivoRechazo", subido_en AS "subidoEn", revisado_en AS "revisadoEn"
    FROM documento WHERE trabajador_id = $1 ORDER BY id`;

export const SQL_NOTIFICAR_ADMINS = `
  INSERT INTO notificacion (cuenta_id, mensaje) SELECT cuenta_id, $1 FROM administrador`;
