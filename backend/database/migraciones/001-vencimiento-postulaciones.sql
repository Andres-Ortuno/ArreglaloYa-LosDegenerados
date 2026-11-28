-- =====================================================================
--  ArreglaloYa · Migración 001 · Vencimiento de postulaciones
--
--  Qué agrega:
--   1. Estado «vencida» para una postulación.
--   2. postulacion.vence_en: hasta cuándo el cliente puede elegirla.
--   3. postulacion.renovaciones: cuántas veces se renovó (máximo 2).
--   4. Trigger: no se puede crear un pedido con una postulación vencida.
--   5. Trigger: una postulación solo se renueva si estaba vencida, con
--      una renovación más y un plazo nuevo que sea futuro.
--
--  Se puede ejecutar más de una vez sin romper nada.
--  Para ejecutarla:  psql -U postgres -d arreglaloya_dev -f 001-vencimiento-postulaciones.sql
-- =====================================================================

-- 1. El valor nuevo del enumerado debe quedar guardado antes de usarse,
--    por eso va fuera del bloque BEGIN ... COMMIT.
ALTER TYPE estado_postulacion ADD VALUE IF NOT EXISTS 'vencida';

BEGIN;

-- 2. Columnas nuevas
ALTER TABLE postulacion
    ADD COLUMN IF NOT EXISTS vence_en     TIMESTAMP,
    ADD COLUMN IF NOT EXISTS renovaciones SMALLINT NOT NULL DEFAULT 0;

-- Las postulaciones que ya existían reciben un plazo:
--   las «enviada» tienen 48 horas desde ahora; las demás, 48 horas desde que se crearon.
UPDATE postulacion
   SET vence_en = CASE WHEN estado = 'enviada' THEN now() + INTERVAL '48 hours'
                       ELSE creada_en + INTERVAL '48 hours' END
 WHERE vence_en IS NULL;

ALTER TABLE postulacion
    ALTER COLUMN vence_en SET NOT NULL,
    ALTER COLUMN vence_en SET DEFAULT (now() + INTERVAL '48 hours');

ALTER TABLE postulacion DROP CONSTRAINT IF EXISTS ck_postulacion_renovaciones;
ALTER TABLE postulacion ADD CONSTRAINT ck_postulacion_renovaciones
    CHECK (renovaciones BETWEEN 0 AND 2);

ALTER TABLE postulacion DROP CONSTRAINT IF EXISTS ck_postulacion_plazo;
ALTER TABLE postulacion ADD CONSTRAINT ck_postulacion_plazo
    CHECK (vence_en > creada_en);

-- Para que el temporizador encuentre rápido las que ya vencieron
CREATE INDEX IF NOT EXISTS ix_postulacion_vence
    ON postulacion (vence_en) WHERE estado = 'enviada';

-- 3. No se crea un pedido con una postulación vencida
CREATE OR REPLACE FUNCTION fn_pedido_postulacion_vigente() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_estado text;
    v_vence  timestamp;
BEGIN
    SELECT estado::text, vence_en INTO v_estado, v_vence
      FROM postulacion WHERE id = NEW.postulacion_id;

    IF v_estado = 'vencida' OR (v_estado = 'enviada' AND v_vence <= now()) THEN
        RAISE EXCEPTION 'La postulación venció. El trabajador debe renovarla para poder elegirla.'
              USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_pedido_postulacion_vigente ON pedido;
CREATE TRIGGER tg_pedido_postulacion_vigente
    BEFORE INSERT ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_pedido_postulacion_vigente();

-- 4. Reglas de la renovación (cuando cambia vence_en)
CREATE OR REPLACE FUNCTION fn_postulacion_renovacion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.vence_en IS DISTINCT FROM OLD.vence_en THEN
        IF NOT (OLD.estado = 'vencida' OR (OLD.estado = 'enviada' AND OLD.vence_en <= now())) THEN
            RAISE EXCEPTION 'Solo se puede renovar una postulación vencida' USING ERRCODE = 'P0001';
        END IF;
        IF NEW.renovaciones <> OLD.renovaciones + 1 THEN
            RAISE EXCEPTION 'Cada renovación debe sumar una al contador' USING ERRCODE = 'P0001';
        END IF;
        IF NEW.estado <> 'enviada' THEN
            RAISE EXCEPTION 'Al renovar, la postulación vuelve a «enviada»' USING ERRCODE = 'P0001';
        END IF;
        IF NEW.vence_en <= now() THEN
            RAISE EXCEPTION 'El nuevo plazo debe estar en el futuro' USING ERRCODE = 'P0001';
        END IF;
    ELSIF NEW.renovaciones <> OLD.renovaciones THEN
        RAISE EXCEPTION 'El contador de renovaciones solo cambia al renovar' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_postulacion_renovacion ON postulacion;
CREATE TRIGGER tg_postulacion_renovacion
    BEFORE UPDATE ON postulacion
    FOR EACH ROW EXECUTE FUNCTION fn_postulacion_renovacion();

COMMIT;
