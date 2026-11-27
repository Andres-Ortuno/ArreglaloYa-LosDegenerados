-- RF-22 / Punto 8: habilita la consulta cronológica de los cambios de estado.
-- Los triggers existentes de la tabla pedido siguen siendo responsables de:
--   1. validar las transiciones de estado;
--   2. insertar en bitacora el estado anterior, el nuevo y app.usuario_id.
-- La creación inicial del pedido se registra desde solicitudes.sql.ts.
--
-- Ejecutar una sola vez en la base PostgreSQL del proyecto.

BEGIN;

-- Si bitacora ya tiene creado_en, se conserva su contenido.
-- Si no lo tiene, los registros nuevos reciben la fecha/hora automáticamente.
ALTER TABLE bitacora
  ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bitacora_pedido_estado_timeline
  ON bitacora (entidad, entidad_id, campo, creado_en);

COMMIT;
