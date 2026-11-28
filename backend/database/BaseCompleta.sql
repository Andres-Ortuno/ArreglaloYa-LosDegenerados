-- =====================================================================
--  ArreglaloYa - Base de datos COMPLETA (esquema + datos de ejemplo)
--  PostgreSQL 14 o superior.
--
--  Para quien instala el proyecto por primera vez:
--    1. En pgAdmin: clic derecho en Databases > Create > Database...
--       y créala con el nombre  arreglaloya_dev  (vacía).
--    2. Clic derecho sobre arreglaloya_dev > Query Tool.
--    3. Abre este archivo (icono de carpeta) y ejecútalo con F5.
--    4. Al final aparece una tabla resumen con la cantidad de filas.
--
--  Por consola (alternativa):
--    psql -U postgres -d arreglaloya_dev -f arreglaloya-base-completa.sql
--
--  Debe ejecutarse sobre una base VACÍA y una sola vez. Si algo falla
--  no se guarda nada: se corrige y se vuelve a ejecutar.
--  Para empezar de cero: borrar la base, crearla otra vez y repetir.
--
--  Contiene:  PARTE 1 = esquema (tablas, reglas, triggers, vistas)
--             PARTE 2 = datos de ejemplo
--  Todas las cuentas de ejemplo usan la contraseña  Demo12345
--  Administrador: admin@arreglaloya.test  (los demás: @ejemplo.test)
-- =====================================================================

-- #####################################################################
-- PARTE 1: ESQUEMA
-- #####################################################################
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;  -- para evitar cruces de horario (RF-14)

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE tipo_cuenta          AS ENUM ('persona', 'empresa');
CREATE TYPE estado_trabajador    AS ENUM ('en_revision', 'activo', 'suspendido');      -- Sección 5
CREATE TYPE tipo_documento       AS ENUM ('identidad', 'antecedentes', 'experiencia'); -- RF-03
CREATE TYPE estado_documento     AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE estado_solicitud     AS ENUM ('pendiente', 'asignada', 'cancelada');       -- RF-24
CREATE TYPE tipo_trabajo         AS ENUM ('fotos', 'visita');                          -- RF-08
CREATE TYPE estado_postulacion   AS ENUM ('enviada', 'elegida', 'descartada');
CREATE TYPE estado_pedido        AS ENUM ('pendiente', 'bajo_revision', 'aprobado',
                                          'en_proceso', 'finalizado', 'cancelado');    -- Sección 5
CREATE TYPE tipo_pago            AS ENUM ('anticipo', 'saldo');                        -- RF-11, RF-28
CREATE TYPE medio_pago           AS ENUM ('qr', 'tarjeta');
CREATE TYPE estado_pago          AS ENUM ('retenido', 'liberado', 'reembolsado',
                                          'liberado_parcial');                         -- RF-12, RF-29, RF-31
CREATE TYPE estado_cambio_monto  AS ENUM ('pendiente', 'aceptado', 'rechazado');       -- RF-27
CREATE TYPE direccion_calif      AS ENUM ('cliente_a_trabajador', 'trabajador_a_cliente');
CREATE TYPE tipo_reporte         AS ENUM ('incumplimiento', 'estafa', 'robo');         -- RF-32
CREATE TYPE estado_reporte       AS ENUM ('pendiente', 'valido', 'rechazado');
CREATE TYPE tipo_sancion         AS ENUM ('suspension', 'suspension_global', 'bloqueo_permanente'); -- RF-20/35/21

-- ---------------------------------------------------------------------
-- 2. CATÁLOGOS
-- ---------------------------------------------------------------------
CREATE TABLE zona (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE especialidad (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(80) NOT NULL UNIQUE      -- Albañilería, Electrodomésticos...
);

CREATE TABLE configuracion (
    clave        VARCHAR(60) PRIMARY KEY,
    valor        VARCHAR(100) NOT NULL,
    descripcion  VARCHAR(200)
);

-- ---------------------------------------------------------------------
-- 3. CUENTAS Y ROLES
-- ---------------------------------------------------------------------
CREATE TABLE cuenta (
    id                  SERIAL PRIMARY KEY,
    correo              VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,                 -- RNF-02: nunca texto plano
    nombre              VARCHAR(120) NOT NULL,
    telefono_whatsapp   VARCHAR(20)  NOT NULL,                 -- RF-17
    tipo                tipo_cuenta  NOT NULL DEFAULT 'persona',
    es_cliente          BOOLEAN NOT NULL DEFAULT TRUE,
    es_trabajador       BOOLEAN NOT NULL DEFAULT FALSE,
    es_administrador    BOOLEAN NOT NULL DEFAULT FALSE,
    intentos_fallidos   SMALLINT NOT NULL DEFAULT 0,           -- RF-33
    bloqueada_hasta     TIMESTAMP,                             -- 15 min tras 5 intentos (RNF-02)
    creada_en           TIMESTAMP NOT NULL DEFAULT now(),
    -- RN-02: una empresa solo puede ser cliente
    CONSTRAINT ck_empresa_solo_cliente CHECK (tipo <> 'empresa' OR es_trabajador = FALSE),
    CONSTRAINT ck_al_menos_un_rol CHECK (es_cliente OR es_trabajador OR es_administrador)
);

CREATE TABLE cliente (
    cuenta_id     INT PRIMARY KEY REFERENCES cuenta(id) ON DELETE CASCADE,
    razon_social  VARCHAR(150)                                 -- solo para empresas
);

CREATE TABLE trabajador (
    cuenta_id                INT PRIMARY KEY REFERENCES cuenta(id) ON DELETE CASCADE,
    zona_id                  INT NOT NULL REFERENCES zona(id),        -- RN-11: solo zona, no domicilio
    estado                   estado_trabajador NOT NULL DEFAULT 'en_revision',
    historial                TEXT,                                    -- RF-02
    numero_documento         VARCHAR(30) UNIQUE,                      -- RF-21: impide re-registro tras bloqueo
    qr_pago_url              VARCHAR(300),                            -- RF-11
    anticipo_minimo          NUMERIC(10,2) CHECK (anticipo_minimo IS NULL OR anticipo_minimo >= 0), -- RN-04
    margen_minutos           SMALLINT NOT NULL DEFAULT 30 CHECK (margen_minutos >= 0),              -- RF-14
    bloqueado_permanente     BOOLEAN NOT NULL DEFAULT FALSE,          -- RF-21
    suspendido_hasta         TIMESTAMP,                               -- RF-20
    creado_en                TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE administrador (
    cuenta_id  INT PRIMARY KEY REFERENCES cuenta(id) ON DELETE CASCADE
);

CREATE TABLE trabajador_especialidad (
    trabajador_id    INT NOT NULL REFERENCES trabajador(cuenta_id) ON DELETE CASCADE,
    especialidad_id  INT NOT NULL REFERENCES especialidad(id),
    PRIMARY KEY (trabajador_id, especialidad_id)
);

-- Documentos: solo los ve el administrador (RNF-03) -> se controla en el backend
CREATE TABLE documento (
    id              SERIAL PRIMARY KEY,
    trabajador_id   INT NOT NULL REFERENCES trabajador(cuenta_id) ON DELETE CASCADE,
    tipo            tipo_documento NOT NULL,
    archivo_url     VARCHAR(300) NOT NULL,
    estado          estado_documento NOT NULL DEFAULT 'pendiente',
    motivo_rechazo  VARCHAR(300),
    revisado_por    INT REFERENCES administrador(cuenta_id),
    subido_en       TIMESTAMP NOT NULL DEFAULT now(),
    revisado_en     TIMESTAMP,
    UNIQUE (trabajador_id, tipo),
    CONSTRAINT ck_rechazo_con_motivo CHECK (estado <> 'rechazado' OR motivo_rechazo IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 4. SOLICITUDES, POSTULACIONES Y PEDIDOS
-- ---------------------------------------------------------------------
CREATE TABLE solicitud (
    id                SERIAL PRIMARY KEY,
    cliente_id        INT NOT NULL REFERENCES cliente(cuenta_id),
    especialidad_id   INT NOT NULL REFERENCES especialidad(id),
    zona_id           INT NOT NULL REFERENCES zona(id),
    descripcion       TEXT NOT NULL,
    ubicacion         VARCHAR(250) NOT NULL,                  -- RF-05
    latitud           NUMERIC(9,6),
    longitud          NUMERIC(9,6),
    estado            estado_solicitud NOT NULL DEFAULT 'pendiente',
    creada_en         TIMESTAMP NOT NULL DEFAULT now(),
    vence_en          TIMESTAMP NOT NULL DEFAULT (now() + INTERVAL '30 days'),   -- S-05 / RF-24
    CONSTRAINT ck_solicitud_descripcion CHECK (length(trim(descripcion)) > 0)
);
CREATE INDEX ix_solicitud_busqueda ON solicitud (estado, zona_id, especialidad_id, creada_en);  -- RF-16 cola por antigüedad

CREATE TABLE solicitud_foto (
    id            SERIAL PRIMARY KEY,
    solicitud_id  INT NOT NULL REFERENCES solicitud(id) ON DELETE CASCADE,
    url           VARCHAR(300) NOT NULL
);

CREATE TABLE solicitud_horario (                              -- al menos uno (se valida en backend)
    id            SERIAL PRIMARY KEY,
    solicitud_id  INT NOT NULL REFERENCES solicitud(id) ON DELETE CASCADE,
    inicio        TIMESTAMP NOT NULL,
    fin           TIMESTAMP NOT NULL,
    CHECK (fin > inicio)
);

CREATE TABLE postulacion (
    id                  SERIAL PRIMARY KEY,
    solicitud_id        INT NOT NULL REFERENCES solicitud(id) ON DELETE CASCADE,
    trabajador_id       INT NOT NULL REFERENCES trabajador(cuenta_id),
    monto               NUMERIC(10,2) NOT NULL CHECK (monto > 0),            -- RF-10: lo fija el trabajador
    tipo_trabajo        tipo_trabajo NOT NULL,                               -- RF-08
    costo_visita        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo_visita >= 0),
    incluye_materiales  BOOLEAN NOT NULL,
    estado              estado_postulacion NOT NULL DEFAULT 'enviada',
    creada_en           TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (solicitud_id, trabajador_id)                                     -- RF-08: una sola vez
);

CREATE TABLE pedido (
    id                  SERIAL PRIMARY KEY,
    solicitud_id        INT NOT NULL UNIQUE REFERENCES solicitud(id),        -- solo una postulación -> un pedido
    postulacion_id      INT NOT NULL UNIQUE REFERENCES postulacion(id),
    cliente_id          INT NOT NULL REFERENCES cliente(cuenta_id),
    trabajador_id       INT NOT NULL REFERENCES trabajador(cuenta_id),
    estado              estado_pedido NOT NULL DEFAULT 'bajo_revision',      -- RF-25
    monto_vigente       NUMERIC(10,2) NOT NULL CHECK (monto_vigente > 0),
    horario_inicio      TIMESTAMP NOT NULL,
    horario_fin         TIMESTAMP NOT NULL,
    margen_minutos      SMALLINT NOT NULL DEFAULT 0 CHECK (margen_minutos >= 0),  -- copia del margen del trabajador
    comision_monto      NUMERIC(10,2) NOT NULL DEFAULT 0,                    -- RF-30 (Bs 0 si está desactivada)
    motivo_cancelacion  VARCHAR(300),
    creado_en           TIMESTAMP NOT NULL DEFAULT now(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (horario_fin > horario_inicio),
    -- RF-14: un trabajador no puede tener dos pedidos activos cuyo horario (con margen) se cruce
    CONSTRAINT ex_sin_cruce_horario EXCLUDE USING gist (
        trabajador_id WITH =,
        tsrange(horario_inicio - make_interval(mins => margen_minutos),
                horario_fin    + make_interval(mins => margen_minutos)) WITH &&
    ) WHERE (estado NOT IN ('cancelado', 'finalizado'))
);
CREATE INDEX ix_pedido_cliente    ON pedido (cliente_id);
CREATE INDEX ix_pedido_trabajador ON pedido (trabajador_id, estado);

-- ---------------------------------------------------------------------
-- 5. PAGOS
-- ---------------------------------------------------------------------
CREATE TABLE pago (
    id                       SERIAL PRIMARY KEY,
    pedido_id                INT NOT NULL REFERENCES pedido(id),
    tipo                     tipo_pago NOT NULL,                             -- anticipo o saldo (RF-28)
    monto                    NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    medio                    medio_pago NOT NULL,
    estado                   estado_pago NOT NULL DEFAULT 'retenido',
    referencia_externa       VARCHAR(100),                                   -- comprobante QR/tarjeta (R-06)
    monto_liberado           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_liberado >= 0),   -- al trabajador
    monto_reembolsado        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (monto_reembolsado >= 0),-- al cliente (RF-31)
    pagado_en                TIMESTAMP NOT NULL DEFAULT now(),
    liberado_en              TIMESTAMP,
    CHECK (monto_liberado + monto_reembolsado <= monto)
);
CREATE INDEX ix_pago_pedido ON pago (pedido_id);

CREATE TABLE cambio_monto (                                                  -- RF-27: nunca a escondidas
    id               SERIAL PRIMARY KEY,
    pedido_id        INT NOT NULL REFERENCES pedido(id),
    monto_anterior   NUMERIC(10,2) NOT NULL,
    monto_nuevo      NUMERIC(10,2) NOT NULL CHECK (monto_nuevo > 0),
    motivo           VARCHAR(300) NOT NULL CHECK (length(trim(motivo)) > 0), -- sin razón no se guarda
    autor_id         INT NOT NULL REFERENCES trabajador(cuenta_id),
    estado           estado_cambio_monto NOT NULL DEFAULT 'pendiente',
    creado_en        TIMESTAMP NOT NULL DEFAULT now(),
    respondido_en    TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 6. REPUTACIÓN, REPORTES Y SANCIONES
-- ---------------------------------------------------------------------
CREATE TABLE calificacion (
    id               SERIAL PRIMARY KEY,
    pedido_id        INT NOT NULL REFERENCES pedido(id),
    direccion        direccion_calif NOT NULL,
    autor_id         INT NOT NULL REFERENCES cuenta(id),
    destinatario_id  INT NOT NULL REFERENCES cuenta(id),
    estrellas        SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),    -- RF-18
    comentario       VARCHAR(500),
    creada_en        TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (pedido_id, direccion)                                            -- una sola vez por pedido
);
CREATE INDEX ix_calificacion_dest ON calificacion (destinatario_id, direccion);
-- RN-12: la dirección 'trabajador_a_cliente' nunca se expone al cliente (se controla en el backend)

CREATE TABLE reporte (
    id               SERIAL PRIMARY KEY,
    pedido_id        INT NOT NULL REFERENCES pedido(id),
    cliente_id       INT NOT NULL REFERENCES cliente(cuenta_id),
    trabajador_id    INT NOT NULL REFERENCES trabajador(cuenta_id),
    tipo             tipo_reporte NOT NULL,
    descripcion      TEXT NOT NULL,
    estado           estado_reporte NOT NULL DEFAULT 'pendiente',
    validado_por     INT REFERENCES administrador(cuenta_id),
    creado_en        TIMESTAMP NOT NULL DEFAULT now(),
    validado_en      TIMESTAMP,
    UNIQUE (pedido_id, cliente_id)                                           -- un reporte por cliente y pedido (pregunta 2, sección 15)
);
CREATE INDEX ix_reporte_trabajador ON reporte (trabajador_id, estado);

CREATE TABLE sancion (
    id                 SERIAL PRIMARY KEY,
    cuenta_id          INT NOT NULL REFERENCES cuenta(id),
    tipo               tipo_sancion NOT NULL,
    motivo             VARCHAR(300) NOT NULL,
    reporte_id         INT REFERENCES reporte(id),
    horas              SMALLINT CHECK (horas IN (1, 2, 3, 5, 8, 13)),        -- RN-07 (Fibonacci)
    inicio             TIMESTAMP NOT NULL DEFAULT now(),
    fin                TIMESTAMP,
    denuncia_policial  VARCHAR(300),                                         -- RF-21
    aplicada_por       INT REFERENCES administrador(cuenta_id),
    -- Suspensión: requiere horas. Bloqueo permanente: requiere denuncia.
    CONSTRAINT ck_sancion_suspension CHECK (tipo = 'bloqueo_permanente' OR horas IS NOT NULL),
    CONSTRAINT ck_sancion_bloqueo   CHECK (tipo <> 'bloqueo_permanente' OR denuncia_policial IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- 7. BITÁCORA Y NOTIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE bitacora (                                                      -- RF-22, RNF-08
    id               BIGSERIAL PRIMARY KEY,
    pedido_id        INT REFERENCES pedido(id),
    entidad          VARCHAR(40) NOT NULL,                                   -- 'pedido', 'pago', 'cambio_monto'...
    entidad_id       INT NOT NULL,
    campo            VARCHAR(40) NOT NULL,                                   -- 'estado', 'monto'...
    valor_anterior   VARCHAR(200),
    valor_nuevo      VARCHAR(200),
    usuario_id       INT REFERENCES cuenta(id),
    fecha            TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_bitacora_pedido ON bitacora (pedido_id, fecha);

CREATE TABLE notificacion (                                                  -- RF-17 (WhatsApp)
    id           SERIAL PRIMARY KEY,
    cuenta_id    INT NOT NULL REFERENCES cuenta(id),
    pedido_id    INT REFERENCES pedido(id),
    mensaje      VARCHAR(300) NOT NULL,
    enviada      BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en    TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 8. REGLAS DE NEGOCIO EN LA BASE (TRIGGERS)
-- ---------------------------------------------------------------------

-- 8.1 La bitácora no se puede editar ni borrar (RF-22)
CREATE FUNCTION fn_bitacora_inmutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'La bitácora no es editable';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_bitacora_inmutable
    BEFORE UPDATE OR DELETE ON bitacora
    FOR EACH ROW EXECUTE FUNCTION fn_bitacora_inmutable();

-- 8.2 Límite de solicitudes por semana: 3 personas, 10 empresas (RF-06, RN-10)
CREATE FUNCTION fn_limite_solicitudes() RETURNS trigger AS $$
DECLARE
    v_tipo    tipo_cuenta;
    v_limite  INT;
    v_total   INT;
BEGIN
    SELECT c.tipo INTO v_tipo FROM cuenta c WHERE c.id = NEW.cliente_id;
    v_limite := CASE WHEN v_tipo = 'empresa' THEN 10 ELSE 3 END;

    SELECT count(*) INTO v_total
      FROM solicitud
     WHERE cliente_id = NEW.cliente_id
       AND creada_en >= date_trunc('week', now());

    IF v_total >= v_limite THEN
        RAISE EXCEPTION 'Límite de % solicitudes por semana alcanzado', v_limite;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_limite_solicitudes
    BEFORE INSERT ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_limite_solicitudes();

-- 8.3 Transiciones válidas del pedido + registro automático en bitácora (RF-13, RF-22)
CREATE FUNCTION fn_transicion_pedido() RETURNS trigger AS $$
BEGIN
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
        IF NOT (
               (OLD.estado = 'pendiente'     AND NEW.estado IN ('bajo_revision', 'cancelado'))
            OR (OLD.estado = 'bajo_revision' AND NEW.estado IN ('aprobado', 'cancelado'))
            OR (OLD.estado = 'aprobado'      AND NEW.estado IN ('en_proceso', 'cancelado'))
            OR (OLD.estado = 'en_proceso'    AND NEW.estado = 'finalizado')
        ) THEN
            RAISE EXCEPTION 'Transición no permitida: % -> %', OLD.estado, NEW.estado;
        END IF;

        INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'pedido', NEW.id, 'estado', OLD.estado::text, NEW.estado::text,
                NULLIF(current_setting('app.usuario_id', true), '')::int);
    END IF;

    IF NEW.monto_vigente IS DISTINCT FROM OLD.monto_vigente THEN
        INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'pedido', NEW.id, 'monto_vigente', OLD.monto_vigente::text, NEW.monto_vigente::text,
                NULLIF(current_setting('app.usuario_id', true), '')::int);
    END IF;

    NEW.actualizado_en := now();
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_transicion_pedido
    BEFORE UPDATE ON pedido
    FOR EACH ROW EXECUTE FUNCTION fn_transicion_pedido();

-- 8.4 Registrar en bitácora cada pago nuevo y cada cambio de su estado (RF-22)
CREATE FUNCTION fn_bitacora_pago() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.pedido_id, 'pago', NEW.id, 'estado', NULL, NEW.estado::text,
                NULLIF(current_setting('app.usuario_id', true), '')::int);
    ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
        INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.pedido_id, 'pago', NEW.id, 'estado', OLD.estado::text, NEW.estado::text,
                NULLIF(current_setting('app.usuario_id', true), '')::int);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_bitacora_pago
    AFTER INSERT OR UPDATE ON pago
    FOR EACH ROW EXECUTE FUNCTION fn_bitacora_pago();

-- 8.5 Registrar cambios de monto propuestos por el trabajador (RF-27)
CREATE FUNCTION fn_bitacora_cambio_monto() RETURNS trigger AS $$
BEGIN
    INSERT INTO bitacora (pedido_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, usuario_id)
    VALUES (NEW.pedido_id, 'cambio_monto', NEW.id, 'monto_propuesto',
            NEW.monto_anterior::text, NEW.monto_nuevo::text, NEW.autor_id);
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_bitacora_cambio_monto
    AFTER INSERT ON cambio_monto
    FOR EACH ROW EXECUTE FUNCTION fn_bitacora_cambio_monto();

-- 8.6 Solo se califica un pedido finalizado, y solo entre las partes del pedido (RF-18, RF-19)
CREATE FUNCTION fn_validar_calificacion() RETURNS trigger AS $$
DECLARE
    p pedido%ROWTYPE;
BEGIN
    SELECT * INTO p FROM pedido WHERE id = NEW.pedido_id;
    IF p.estado <> 'finalizado' THEN
        RAISE EXCEPTION 'Solo se puede calificar un pedido finalizado';
    END IF;
    IF NEW.direccion = 'cliente_a_trabajador'
       AND NOT (NEW.autor_id = p.cliente_id AND NEW.destinatario_id = p.trabajador_id) THEN
        RAISE EXCEPTION 'Calificación inválida: autor/destinatario no coinciden con el pedido';
    END IF;
    IF NEW.direccion = 'trabajador_a_cliente'
       AND NOT (NEW.autor_id = p.trabajador_id AND NEW.destinatario_id = p.cliente_id) THEN
        RAISE EXCEPTION 'Calificación inválida: autor/destinatario no coinciden con el pedido';
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER tg_validar_calificacion
    BEFORE INSERT ON calificacion
    FOR EACH ROW EXECUTE FUNCTION fn_validar_calificacion();

-- ---------------------------------------------------------------------
-- 9. VISTAS ÚTILES
-- ---------------------------------------------------------------------

-- Búsqueda de trabajadores activos con su promedio (RF-07). Nunca expone documentos ni domicilio.
CREATE VIEW v_trabajador_publico AS
SELECT  t.cuenta_id,
        c.nombre,
        z.nombre AS zona,
        t.zona_id,
        COALESCE(round(avg(k.estrellas), 2), 0) AS calificacion_promedio,
        count(k.id)                             AS cantidad_opiniones
FROM    trabajador t
JOIN    cuenta c ON c.id = t.cuenta_id
JOIN    zona   z ON z.id = t.zona_id
LEFT JOIN calificacion k
       ON k.destinatario_id = t.cuenta_id AND k.direccion = 'cliente_a_trabajador'
WHERE   t.estado = 'activo' AND NOT t.bloqueado_permanente
GROUP BY t.cuenta_id, c.nombre, z.nombre, t.zona_id;

-- Reporte económico (RF-23): filtrar por rango de fechas sobre pagado_en
CREATE VIEW v_flujo_economico AS
SELECT  d.fecha,
        d.total_pagado,
        d.retenido,
        d.liberado,
        d.reembolsado,
        COALESCE(c.comision, 0) AS comision
FROM   (SELECT  p.pagado_en::date                                 AS fecha,
                sum(p.monto)                                      AS total_pagado,
                sum(p.monto) FILTER (WHERE p.estado = 'retenido') AS retenido,
                sum(p.monto_liberado)                             AS liberado,
                sum(p.monto_reembolsado)                          AS reembolsado
        FROM    pago p
        GROUP BY p.pagado_en::date) d
LEFT JOIN (SELECT  actualizado_en::date AS fecha, sum(comision_monto) AS comision
           FROM    pedido
           WHERE   estado = 'finalizado'
           GROUP BY actualizado_en::date) c ON c.fecha = d.fecha;

-- Solicitudes vencidas (RF-24): se ejecuta periódicamente desde el backend
CREATE FUNCTION fn_anular_solicitudes_vencidas() RETURNS INT AS $$
DECLARE n INT;
BEGIN
    UPDATE solicitud SET estado = 'cancelada'
     WHERE estado = 'pendiente' AND vence_en <= now();
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END; $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 10. DATOS INICIALES
-- ---------------------------------------------------------------------
INSERT INTO especialidad (nombre) VALUES ('Albañilería'), ('Reparación de electrodomésticos');

INSERT INTO zona (nombre) VALUES
    ('Zona Norte'), ('Zona Sur'), ('Zona Central'), ('Zona Este'), ('Zona Oeste');   -- ajustar a las zonas reales

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('anticipo_porcentaje',     '25',   'RN-04: porcentaje del anticipo'),
    ('comision_activa',         'false','S-03: la comisión se activa cuando el servicio funcione'),
    ('comision_porcentaje',     '3',    'S-03: comisión sobre trabajos finalizados'),
    ('limite_solicitudes_persona', '3', 'RN-10'),
    ('limite_solicitudes_empresa','10', 'RN-10'),
    ('dias_vencimiento_solicitud','30', 'S-05'),
    ('max_intentos_login',      '5',    'RNF-02'),
    ('minutos_bloqueo_login',   '15',   'RNF-02'),
    ('reparto_visita_trabajador_pct', '100', 'RN-05 PENDIENTE: confirmar el reparto'),
    ('descuento_transporte',    '0',    'RN-06 PENDIENTE: confirmar el monto');

COMMIT;

-- #####################################################################
-- PARTE 2: DATOS DE EJEMPLO
-- #####################################################################
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- para generar los hash de contraseña (bcrypt)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cuenta WHERE correo = 'admin@arreglaloya.test') THEN
        RAISE EXCEPTION 'Los datos de ejemplo ya fueron cargados en esta base. No se cambió nada.';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- Funciones auxiliares (temporales: desaparecen al cerrar la conexión)
-- ---------------------------------------------------------------------
CREATE FUNCTION pg_temp.c(p_correo text) RETURNS int LANGUAGE sql AS
$$ SELECT id FROM cuenta WHERE correo = p_correo $$;

CREATE FUNCTION pg_temp.z(p_nombre text) RETURNS int LANGUAGE sql AS
$$ SELECT id FROM zona WHERE nombre = p_nombre $$;

CREATE FUNCTION pg_temp.e(p_nombre text) RETURNS int LANGUAGE sql AS
$$ SELECT id FROM especialidad WHERE nombre = p_nombre $$;

-- Cuenta con contraseña Demo12345 (hash bcrypt, el mismo formato que usa el backend)
CREATE FUNCTION pg_temp.cuenta(p_correo text, p_nombre text, p_tel text, p_tipo tipo_cuenta,
                               p_cliente boolean, p_trab boolean, p_admin boolean, p_razon text)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_id int;
BEGIN
    INSERT INTO cuenta (correo, password_hash, nombre, telefono_whatsapp, tipo,
                        es_cliente, es_trabajador, es_administrador, creada_en)
    VALUES (p_correo, crypt('Demo12345', gen_salt('bf', 10)), p_nombre, p_tel, p_tipo,
            p_cliente, p_trab, p_admin, now() - interval '60 days')
    RETURNING id INTO v_id;
    IF p_cliente THEN INSERT INTO cliente (cuenta_id, razon_social) VALUES (v_id, p_razon); END IF;
    IF p_admin   THEN INSERT INTO administrador (cuenta_id) VALUES (v_id); END IF;
    RETURN v_id;
END $$;

CREATE FUNCTION pg_temp.trabajador(p_correo text, p_zona text, p_esp text[], p_estado estado_trabajador,
                                   p_historial text, p_doc text, p_margen int, p_anticipo numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO trabajador (cuenta_id, zona_id, estado, historial, numero_documento,
                            anticipo_minimo, margen_minutos, creado_en)
    VALUES (pg_temp.c(p_correo), pg_temp.z(p_zona), p_estado, p_historial, p_doc,
            p_anticipo, p_margen, now() - interval '55 days');
    INSERT INTO trabajador_especialidad (trabajador_id, especialidad_id)
    SELECT pg_temp.c(p_correo), pg_temp.e(x) FROM unnest(p_esp) AS x;
END $$;

-- Solicitud con 1 horario (o 2 si p_dos) y fotos opcionales. Devuelve su id.
CREATE FUNCTION pg_temp.solicitud(p_cliente text, p_esp text, p_zona text, p_desc text, p_ubic text,
                                  p_estado estado_solicitud, p_creada timestamp, p_inicio timestamp,
                                  p_horas int, p_dos boolean, p_fotos text[])
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_id int;
BEGIN
    INSERT INTO solicitud (cliente_id, especialidad_id, zona_id, descripcion, ubicacion,
                           estado, creada_en, vence_en)
    VALUES (pg_temp.c(p_cliente), pg_temp.e(p_esp), pg_temp.z(p_zona), p_desc, p_ubic,
            p_estado, p_creada, p_creada + interval '30 days')
    RETURNING id INTO v_id;
    INSERT INTO solicitud_horario (solicitud_id, inicio, fin)
    VALUES (v_id, p_inicio, p_inicio + make_interval(hours => p_horas));
    IF p_dos THEN
        INSERT INTO solicitud_horario (solicitud_id, inicio, fin)
        VALUES (v_id, p_inicio + interval '1 day', p_inicio + interval '1 day' + make_interval(hours => p_horas));
    END IF;
    IF p_fotos IS NOT NULL THEN
        INSERT INTO solicitud_foto (solicitud_id, url) SELECT v_id, unnest(p_fotos);
    END IF;
    RETURN v_id;
END $$;

CREATE FUNCTION pg_temp.postular(p_sol int, p_trab text, p_monto numeric, p_tipo tipo_trabajo,
                                 p_visita numeric, p_mat boolean, p_estado estado_postulacion,
                                 p_creada timestamp)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE v_id int;
BEGIN
    INSERT INTO postulacion (solicitud_id, trabajador_id, monto, tipo_trabajo, costo_visita,
                             incluye_materiales, estado, creada_en)
    VALUES (p_sol, pg_temp.c(p_trab), p_monto, p_tipo, p_visita, p_mat, p_estado, p_creada)
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

-- Cambia el estado de un pedido respetando el trigger de transiciones (queda en la bitácora)
CREATE FUNCTION pg_temp.mover(p_ped int, p_usuario int, p_estado estado_pedido, p_motivo text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    PERFORM set_config('app.usuario_id', p_usuario::text, true);
    UPDATE pedido SET estado = p_estado,
                      motivo_cancelacion = COALESCE(p_motivo, motivo_cancelacion)
     WHERE id = p_ped;
END $$;

CREATE FUNCTION pg_temp.pago(p_ped int, p_tipo tipo_pago, p_monto numeric, p_medio medio_pago,
                             p_estado estado_pago, p_liberado numeric, p_reembolsado numeric,
                             p_pagado timestamp, p_liberado_en timestamp)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO pago (pedido_id, tipo, monto, medio, estado, referencia_externa,
                      monto_liberado, monto_reembolsado, pagado_en, liberado_en)
    VALUES (p_ped, p_tipo, p_monto, p_medio, p_estado,
            'SIM-' || upper(substr(md5(random()::text || p_ped::text || p_tipo::text), 1, 8)),
            p_liberado, p_reembolsado, p_pagado, p_liberado_en);
END $$;

-- Pedido completo ya FINALIZADO, con anticipo y saldo liberados y calificaciones
CREATE FUNCTION pg_temp.pedido_finalizado(p_cliente text, p_trab text, p_esp text, p_desc text,
                                          p_ubic text, p_dias int, p_monto numeric,
                                          p_est int, p_com text, p_est_t int, p_com_t text)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
    v_cli int := pg_temp.c(p_cliente);
    v_trab int := pg_temp.c(p_trab);
    v_ini timestamp := (date_trunc('day', now()) - make_interval(days => p_dias) + interval '9 hours')::timestamp;
    v_sol int; v_post int; v_ped int; v_anticipo numeric;
BEGIN
    v_sol := pg_temp.solicitud(p_cliente, p_esp,
                (SELECT z.nombre FROM trabajador t JOIN zona z ON z.id = t.zona_id WHERE t.cuenta_id = v_trab),
                p_desc, p_ubic, 'asignada', v_ini - interval '3 days', v_ini, 3, false, NULL);
    v_post := pg_temp.postular(v_sol, p_trab, p_monto, 'visita', 20, false, 'elegida', v_ini - interval '2 days');

    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente,
                        horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (v_sol, v_post, v_cli, v_trab, p_monto, v_ini, v_ini + interval '3 hours',
            (SELECT margen_minutos FROM trabajador WHERE cuenta_id = v_trab), v_ini - interval '2 days')
    RETURNING id INTO v_ped;

    -- Anticipo: el 25 % o el mínimo del trabajador, el que sea mayor (RN-04)
    v_anticipo := GREATEST(round(p_monto * 0.25, 2),
                           COALESCE((SELECT anticipo_minimo FROM trabajador WHERE cuenta_id = v_trab), 0));
    PERFORM set_config('app.usuario_id', v_cli::text, true);
    PERFORM pg_temp.pago(v_ped, 'anticipo', v_anticipo, 'qr', 'liberado', v_anticipo, 0,
                         v_ini - interval '1 day', v_ini + interval '3 hours');
    PERFORM pg_temp.pago(v_ped, 'saldo', p_monto - v_anticipo, 'qr', 'liberado', p_monto - v_anticipo, 0,
                         v_ini + interval '3 hours', v_ini + interval '3 hours');

    PERFORM pg_temp.mover(v_ped, v_cli, 'aprobado', NULL);
    PERFORM pg_temp.mover(v_ped, v_trab, 'en_proceso', NULL);
    PERFORM pg_temp.mover(v_ped, v_trab, 'finalizado', NULL);

    INSERT INTO calificacion (pedido_id, direccion, autor_id, destinatario_id, estrellas, comentario, creada_en)
    VALUES (v_ped, 'cliente_a_trabajador', v_cli, v_trab, p_est, p_com, v_ini + interval '1 day');
    IF p_est_t IS NOT NULL THEN
        INSERT INTO calificacion (pedido_id, direccion, autor_id, destinatario_id, estrellas, comentario, creada_en)
        VALUES (v_ped, 'trabajador_a_cliente', v_trab, v_cli, p_est_t, p_com_t, v_ini + interval '1 day');
    END IF;
    RETURN v_ped;
END $$;


-- ---------------------------------------------------------------------
-- 1. Zonas reales de Cochabamba (se suman a las 5 zonas genéricas del script del esquema)
-- ---------------------------------------------------------------------
INSERT INTO zona (nombre) VALUES ('Cercado'), ('Sacaba'), ('Quillacollo'), ('Tiquipaya'), ('Colcapirhua')
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Cuentas
-- ---------------------------------------------------------------------
-- Administrador
SELECT pg_temp.cuenta('admin@arreglaloya.test', 'Administrador ArreglaloYa', '+59170000000', 'persona', false, false, true, NULL);

-- Clientes (personas)
SELECT pg_temp.cuenta('laura.vargas@ejemplo.test', 'Laura Vargas', '+59171100001', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('pedro.camacho@ejemplo.test', 'Pedro Camacho', '+59171100002', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('sofia.rojas@ejemplo.test', 'Sofía Rojas', '+59171100003', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('diego.flores@ejemplo.test', 'Diego Flores', '+59171100004', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('valeria.mamani@ejemplo.test', 'Valeria Mamani', '+59171100005', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('marcos.quispe@ejemplo.test', 'Marcos Quispe', '+59171100006', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('andrea.salazar@ejemplo.test', 'Andrea Salazar', '+59171100007', 'persona', true, false, false, NULL);
SELECT pg_temp.cuenta('luis.terrazas@ejemplo.test', 'Luis Terrazas', '+59171100008', 'persona', true, false, false, NULL);

-- Clientes (empresas: solo pueden ser cliente, RN-02)
SELECT pg_temp.cuenta('constructora.andina@ejemplo.test', 'Carmen Ledezma', '+59171100009', 'empresa', true, false, false, 'Constructora Andina S.R.L.');
SELECT pg_temp.cuenta('inmobiliaria.valle@ejemplo.test', 'Jorge Antezana', '+59171100010', 'empresa', true, false, false, 'Inmobiliaria del Valle S.A.');

-- Trabajadores
SELECT pg_temp.cuenta('roberto.medina@ejemplo.test', 'Roberto Medina', '+59172200001', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('juancarlos.pinto@ejemplo.test', 'Juan Carlos Pinto', '+59172200002', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('mario.arce@ejemplo.test', 'Mario Arce', '+59172200003', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('fernando.ortiz@ejemplo.test', 'Fernando Ortiz', '+59172200004', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('elena.choque@ejemplo.test', 'Elena Choque', '+59172200005', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('gustavo.lara@ejemplo.test', 'Gustavo Lara', '+59172200006', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('pablo.ugarte@ejemplo.test', 'Pablo Ugarte', '+59172200007', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('hugo.villca@ejemplo.test', 'Hugo Villca', '+59172200008', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('daniel.soliz@ejemplo.test', 'Daniel Soliz', '+59172200009', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('ricardo.aliaga@ejemplo.test', 'Ricardo Aliaga', '+59172200010', 'persona', false, true, false, NULL);
SELECT pg_temp.cuenta('oscar.lijeron@ejemplo.test', 'Oscar Lijerón', '+59172200011', 'persona', false, true, false, NULL);

-- Una cuenta con los dos roles (RN-01): contrata y también trabaja
SELECT pg_temp.cuenta('rosa.guzman@ejemplo.test', 'Rosa Guzmán', '+59173300001', 'persona', true, true, false, NULL);

-- ---------------------------------------------------------------------
-- 3. Perfiles de trabajador, especialidades y documentos (RF-02, RF-03, RF-04)
-- ---------------------------------------------------------------------
SELECT pg_temp.trabajador('roberto.medina@ejemplo.test', 'Cercado', ARRAY['Albañilería'], 'activo', '10 años en obra gruesa, revoques y refacciones de viviendas.', '4512367 CB', 30, 100);
SELECT pg_temp.trabajador('juancarlos.pinto@ejemplo.test', 'Cercado', ARRAY['Reparación de electrodomésticos'], 'activo', 'Técnico en lavadoras, refrigeradores y cocinas. 8 años de experiencia.', '5123890 CB', 45, NULL);
SELECT pg_temp.trabajador('mario.arce@ejemplo.test', 'Sacaba', ARRAY['Albañilería'], 'activo', 'Pisos, cerámica y techos. Trabajo con mi propio equipo.', '6034512 CB', 30, NULL);
SELECT pg_temp.trabajador('fernando.ortiz@ejemplo.test', 'Quillacollo', ARRAY['Albañilería', 'Reparación de electrodomésticos'], 'activo', 'Albañil y técnico en electrodomésticos. 12 años.', '3987456 CB', 30, 150);
SELECT pg_temp.trabajador('elena.choque@ejemplo.test', 'Tiquipaya', ARRAY['Reparación de electrodomésticos'], 'activo', 'Reparación de cocinas, hornos y lavadoras a domicilio.', '7120345 CB', 30, NULL);
SELECT pg_temp.trabajador('gustavo.lara@ejemplo.test', 'Colcapirhua', ARRAY['Albañilería'], 'activo', 'Losas, muros y acabados. Presupuesto sin costo.', '4678123 CB', 60, NULL);
SELECT pg_temp.trabajador('pablo.ugarte@ejemplo.test', 'Cercado', ARRAY['Reparación de electrodomésticos'], 'activo', 'Secadoras, microondas y refrigeradores. 5 años.', '8123450 CB', 30, NULL);
SELECT pg_temp.trabajador('hugo.villca@ejemplo.test', 'Sacaba', ARRAY['Reparación de electrodomésticos'], 'en_revision', 'Técnico recién registrado, a la espera de verificación.', '6890123 CB', 30, NULL);
SELECT pg_temp.trabajador('daniel.soliz@ejemplo.test', 'Quillacollo', ARRAY['Albañilería'], 'en_revision', 'Albañil con 4 años de experiencia.', '5567890 CB', 30, NULL);
SELECT pg_temp.trabajador('ricardo.aliaga@ejemplo.test', 'Cercado', ARRAY['Albañilería'], 'suspendido', 'Albañil con experiencia en revestimientos.', '4012389 CB', 30, NULL);
SELECT pg_temp.trabajador('oscar.lijeron@ejemplo.test', 'Sacaba', ARRAY['Reparación de electrodomésticos'], 'suspendido', 'Técnico en refrigeración.', '3345678 CB', 30, NULL);
SELECT pg_temp.trabajador('rosa.guzman@ejemplo.test', 'Cercado', ARRAY['Reparación de electrodomésticos'], 'activo', 'Técnica en lavavajillas y lavadoras. También contrato servicios como cliente.', '5234109 CB', 30, NULL);

-- Documentos: los trabajadores activos o suspendidos tienen los 3 aprobados por el administrador;
-- Hugo (en revisión) tiene los 3 pendientes y Daniel tiene uno rechazado con motivo.
INSERT INTO documento (trabajador_id, tipo, archivo_url, estado, motivo_rechazo, revisado_por, subido_en, revisado_en)
SELECT pg_temp.c(d.correo), d.tipo::tipo_documento,
       'https://ejemplo.arreglaloya.test/documentos/' || pg_temp.c(d.correo) || '-' || d.tipo || '.pdf',
       d.estado::estado_documento, d.motivo,
       CASE WHEN d.estado = 'pendiente' THEN NULL ELSE pg_temp.c('admin@arreglaloya.test') END,
       now() - interval '50 days',
       CASE WHEN d.estado = 'pendiente' THEN NULL ELSE now() - interval '48 days' END
  FROM (VALUES
    ('roberto.medina@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('roberto.medina@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('roberto.medina@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('juancarlos.pinto@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('juancarlos.pinto@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('juancarlos.pinto@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('mario.arce@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('mario.arce@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('mario.arce@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('fernando.ortiz@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('fernando.ortiz@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('fernando.ortiz@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('elena.choque@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('elena.choque@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('elena.choque@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('gustavo.lara@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('gustavo.lara@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('gustavo.lara@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('pablo.ugarte@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('pablo.ugarte@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('pablo.ugarte@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('hugo.villca@ejemplo.test', 'identidad', 'pendiente', NULL),
    ('hugo.villca@ejemplo.test', 'antecedentes', 'pendiente', NULL),
    ('hugo.villca@ejemplo.test', 'experiencia', 'pendiente', NULL),
    ('daniel.soliz@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('daniel.soliz@ejemplo.test', 'antecedentes', 'rechazado', 'El certificado de antecedentes está vencido (más de 3 meses).'),
    ('daniel.soliz@ejemplo.test', 'experiencia', 'pendiente', NULL),
    ('ricardo.aliaga@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('ricardo.aliaga@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('ricardo.aliaga@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('oscar.lijeron@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('oscar.lijeron@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('oscar.lijeron@ejemplo.test', 'experiencia', 'aprobado', NULL),
    ('rosa.guzman@ejemplo.test', 'identidad', 'aprobado', NULL),
    ('rosa.guzman@ejemplo.test', 'antecedentes', 'aprobado', NULL),
    ('rosa.guzman@ejemplo.test', 'experiencia', 'aprobado', NULL)
  ) AS d(correo, tipo, estado, motivo);

-- ---------------------------------------------------------------------
-- 4. Pedidos ya FINALIZADOS con pagos y calificaciones (dan reputación a los trabajadores)
--    Quedan registrados en la bitácora por el trigger del esquema (RF-22).
-- ---------------------------------------------------------------------
SELECT pg_temp.pedido_finalizado('laura.vargas@ejemplo.test', 'roberto.medina@ejemplo.test', 'Albañilería', 'Revoque de pared del dormitorio', 'Av. Heroínas #512, Cercado', 40, 600, 5, 'Excelente trabajo, muy prolijo y puntual.', 5, 'Cliente amable, pagó a tiempo.');
SELECT pg_temp.pedido_finalizado('pedro.camacho@ejemplo.test', 'roberto.medina@ejemplo.test', 'Albañilería', 'Construcción de un muro de ladrillo', 'Calle Jordán #230, Cercado', 30, 1200, 4, 'Buen trabajo, terminó un poco tarde.', 4, 'Todo en orden.');
SELECT pg_temp.pedido_finalizado('sofia.rojas@ejemplo.test', 'roberto.medina@ejemplo.test', 'Albañilería', 'Arreglo de humedad en el baño', 'Av. Ballivián #88, Cercado', 20, 450, 5, 'Solucionó el problema de raíz.', NULL, NULL);
SELECT pg_temp.pedido_finalizado('diego.flores@ejemplo.test', 'juancarlos.pinto@ejemplo.test', 'Reparación de electrodomésticos', 'Lavadora que no centrifuga', 'Calle España #145, Cercado', 35, 280, 4, 'Resolvió la falla rápido.', 5, 'Cliente puntual.');
SELECT pg_temp.pedido_finalizado('valeria.mamani@ejemplo.test', 'juancarlos.pinto@ejemplo.test', 'Reparación de electrodomésticos', 'Refrigerador que no enfría', 'Av. Oquendo #310, Cercado', 15, 350, 5, 'Muy profesional, explicó bien la falla.', 5, 'Excelente cliente.');
SELECT pg_temp.pedido_finalizado('marcos.quispe@ejemplo.test', 'mario.arce@ejemplo.test', 'Albañilería', 'Piso de cerámica en la cocina', 'Av. Blanco Galindo km 5, Sacaba', 45, 900, 5, 'Quedó perfecto.', 4, 'Cliente ordenado.');
SELECT pg_temp.pedido_finalizado('andrea.salazar@ejemplo.test', 'mario.arce@ejemplo.test', 'Albañilería', 'Reparación de techo con goteras', 'Calle Bolívar #77, Sacaba', 25, 700, 4, 'Cumplió lo acordado.', NULL, NULL);
SELECT pg_temp.pedido_finalizado('luis.terrazas@ejemplo.test', 'fernando.ortiz@ejemplo.test', 'Albañilería', 'Cerco perimetral de ladrillo', 'Av. Ferrocarril #402, Quillacollo', 50, 1500, 3, 'Bien, pero hubo demora.', 4, 'Cliente exigente pero justo.');
SELECT pg_temp.pedido_finalizado('constructora.andina@ejemplo.test', 'fernando.ortiz@ejemplo.test', 'Albañilería', 'Reparación de muros en obra', 'Av. Martín Cárdenas #1200, Quillacollo', 22, 2400, 4, 'Cumple con los plazos.', 5, 'Excelente empresa para trabajar.');
SELECT pg_temp.pedido_finalizado('laura.vargas@ejemplo.test', 'elena.choque@ejemplo.test', 'Reparación de electrodomésticos', 'Cocina a gas con llama débil', 'Calle Ayacucho #55, Tiquipaya', 28, 220, 5, 'Rapidísima y amable.', 5, 'Muy buena cliente.');
SELECT pg_temp.pedido_finalizado('inmobiliaria.valle@ejemplo.test', 'elena.choque@ejemplo.test', 'Reparación de electrodomésticos', 'Mantenimiento de 3 lavadoras', 'Av. Tiquipaya #900, Tiquipaya', 18, 600, 5, 'Muy confiable.', 5, 'Empresa seria.');
SELECT pg_temp.pedido_finalizado('pedro.camacho@ejemplo.test', 'gustavo.lara@ejemplo.test', 'Albañilería', 'Losa del patio', 'Calle Los Pinos #12, Colcapirhua', 33, 1100, 4, 'Buen acabado.', NULL, NULL);
SELECT pg_temp.pedido_finalizado('sofia.rojas@ejemplo.test', 'pablo.ugarte@ejemplo.test', 'Reparación de electrodomésticos', 'Secadora que no calienta', 'Av. Ballivián #88, Cercado', 26, 300, 3, 'Funcionó, pero tuve que llamar dos veces.', 4, 'Cliente comprensiva.');
SELECT pg_temp.pedido_finalizado('diego.flores@ejemplo.test', 'pablo.ugarte@ejemplo.test', 'Reparación de electrodomésticos', 'Microondas que no enciende', 'Calle España #145, Cercado', 12, 180, 4, 'Correcto.', NULL, NULL);
SELECT pg_temp.pedido_finalizado('valeria.mamani@ejemplo.test', 'rosa.guzman@ejemplo.test', 'Reparación de electrodomésticos', 'Lavavajillas con fuga de agua', 'Av. Oquendo #310, Cercado', 21, 320, 5, 'Muy atenta y clara con el precio.', 5, 'Gran cliente.');
SELECT pg_temp.pedido_finalizado('marcos.quispe@ejemplo.test', 'ricardo.aliaga@ejemplo.test', 'Albañilería', 'Instalación de revestimiento', 'Av. Blanco Galindo km 5, Sacaba', 24, 800, 2, 'No respetó el horario acordado.', 3, 'El cliente cambió el horario varias veces.');
SELECT pg_temp.pedido_finalizado('andrea.salazar@ejemplo.test', 'oscar.lijeron@ejemplo.test', 'Reparación de electrodomésticos', 'Reparación de refrigerador', 'Calle Bolívar #77, Sacaba', 29, 400, 1, 'Se llevó un repuesto y no volvió.', NULL, NULL);

-- ---------------------------------------------------------------------
-- 5. Reportes y sanciones (RF-20, RF-21, RF-32, RF-35)
-- ---------------------------------------------------------------------
-- Ricardo: reporte válido por incumplimiento y escalera de suspensiones 1-2-3-5-8-13 h (RN-07).
-- La última (13 h) está vigente desde que se cargan los datos.
INSERT INTO reporte (pedido_id, cliente_id, trabajador_id, tipo, descripcion, estado, validado_por, creado_en, validado_en)
SELECT p.id, p.cliente_id, p.trabajador_id, 'incumplimiento', 'No llegó en el horario acordado y no avisó.',
       'valido', pg_temp.c('admin@arreglaloya.test'), now() - interval '2 days', now() - interval '1 day'
  FROM pedido p WHERE p.trabajador_id = pg_temp.c('ricardo.aliaga@ejemplo.test');

INSERT INTO sancion (cuenta_id, tipo, motivo, horas, inicio, fin, aplicada_por)
SELECT pg_temp.c('ricardo.aliaga@ejemplo.test'), 'suspension', 'Reporte válido anterior (' || h || ' h)', h,
       now() - make_interval(days => (30 - 5 * n)::int), now() - make_interval(days => (30 - 5 * n)::int) + make_interval(hours => h),
       pg_temp.c('admin@arreglaloya.test')
  FROM unnest(ARRAY[1, 2, 3, 5, 8]) WITH ORDINALITY AS t(h, n);

INSERT INTO sancion (cuenta_id, tipo, motivo, reporte_id, horas, inicio, fin, aplicada_por)
SELECT pg_temp.c('ricardo.aliaga@ejemplo.test'), 'suspension', 'Incumplimiento de horario (13 h)', r.id, 13,
       now() - interval '1 day', now() + interval '13 hours', pg_temp.c('admin@arreglaloya.test')
  FROM reporte r WHERE r.trabajador_id = pg_temp.c('ricardo.aliaga@ejemplo.test');

UPDATE trabajador SET suspendido_hasta = now() + interval '13 hours'
 WHERE cuenta_id = pg_temp.c('ricardo.aliaga@ejemplo.test');

-- Oscar: reporte por robo, validado, con bloqueo permanente y denuncia policial (RF-21)
INSERT INTO reporte (pedido_id, cliente_id, trabajador_id, tipo, descripcion, estado, validado_por, creado_en, validado_en)
SELECT p.id, p.cliente_id, p.trabajador_id, 'robo', 'Se llevó un repuesto del refrigerador y no volvió.',
       'valido', pg_temp.c('admin@arreglaloya.test'), now() - interval '10 days', now() - interval '9 days'
  FROM pedido p WHERE p.trabajador_id = pg_temp.c('oscar.lijeron@ejemplo.test');

INSERT INTO sancion (cuenta_id, tipo, motivo, reporte_id, inicio, denuncia_policial, aplicada_por)
SELECT pg_temp.c('oscar.lijeron@ejemplo.test'), 'bloqueo_permanente', 'Robo comprobado con denuncia policial', r.id,
       now() - interval '9 days', 'FELCC-CBBA-2026-004512', pg_temp.c('admin@arreglaloya.test')
  FROM reporte r WHERE r.trabajador_id = pg_temp.c('oscar.lijeron@ejemplo.test');

UPDATE trabajador SET bloqueado_permanente = true
 WHERE cuenta_id = pg_temp.c('oscar.lijeron@ejemplo.test');

-- Reporte todavía pendiente de revisión del administrador
INSERT INTO reporte (pedido_id, cliente_id, trabajador_id, tipo, descripcion, creado_en)
SELECT p.id, p.cliente_id, p.trabajador_id, 'incumplimiento', 'Entregó la obra una semana después de lo acordado.', now() - interval '3 days'
  FROM pedido p WHERE p.trabajador_id = pg_temp.c('fernando.ortiz@ejemplo.test')
   AND p.cliente_id = pg_temp.c('luis.terrazas@ejemplo.test');


-- ---------------------------------------------------------------------
-- 6. Pedidos en curso, en cada estado del ciclo (CU-05 a CU-08)
-- ---------------------------------------------------------------------
DO $$
DECLARE s int; p int; ped int; adm int := pg_temp.c('admin@arreglaloya.test');
BEGIN
    -- A) BAJO REVISIÓN: el cliente eligió y todavía no pagó el anticipo
    s := pg_temp.solicitud('luis.terrazas@ejemplo.test', 'Reparación de electrodomésticos', 'Cercado', 'Congeladora que hace mucho ruido',
                           'Av. América #650, Cercado', 'asignada', (now() - interval '100 hours')::timestamp, (date_trunc('day', now()) + interval '2 days' + interval '9 hours 0 minutes')::timestamp, 2, true, NULL);
    p := pg_temp.postular(s, 'juancarlos.pinto@ejemplo.test', 260, 'visita', 20, false, 'elegida', (now() - interval '90 hours')::timestamp);
    PERFORM pg_temp.postular(s, 'pablo.ugarte@ejemplo.test', 240, 'fotos', 0, true, 'descartada', (now() - interval '88 hours')::timestamp);
    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente, horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (s, p, pg_temp.c('luis.terrazas@ejemplo.test'), pg_temp.c('juancarlos.pinto@ejemplo.test'), 260, (date_trunc('day', now()) + interval '2 days' + interval '9 hours 0 minutes')::timestamp, (date_trunc('day', now()) + interval '2 days' + interval '11 hours 0 minutes')::timestamp, 45, (now() - interval '80 hours')::timestamp);

    -- B) APROBADO: anticipo pagado y retenido, el trabajo es en 3 días
    s := pg_temp.solicitud('andrea.salazar@ejemplo.test', 'Albañilería', 'Sacaba', 'Pared de ladrillo para el lavadero',
                           'Calle Bolívar #77, Sacaba', 'asignada', (now() - interval '120 hours')::timestamp, (date_trunc('day', now()) + interval '3 days' + interval '8 hours 0 minutes')::timestamp, 5, false, NULL);
    p := pg_temp.postular(s, 'mario.arce@ejemplo.test', 800, 'visita', 30, false, 'elegida', (now() - interval '110 hours')::timestamp);
    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente, horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (s, p, pg_temp.c('andrea.salazar@ejemplo.test'), pg_temp.c('mario.arce@ejemplo.test'), 800, (date_trunc('day', now()) + interval '3 days' + interval '8 hours 0 minutes')::timestamp, (date_trunc('day', now()) + interval '3 days' + interval '13 hours 0 minutes')::timestamp, 30, (now() - interval '100 hours')::timestamp)
    RETURNING id INTO ped;
    PERFORM set_config('app.usuario_id', pg_temp.c('andrea.salazar@ejemplo.test')::text, true);
    PERFORM pg_temp.pago(ped, 'anticipo', 200, 'qr', 'retenido', 0, 0, (now() - interval '60 hours')::timestamp, NULL);
    PERFORM pg_temp.mover(ped, pg_temp.c('andrea.salazar@ejemplo.test'), 'aprobado', NULL);

    -- C) EN PROCESO con cambio de monto aceptado: 300 -> 400 (RF-27)
    s := pg_temp.solicitud('valeria.mamani@ejemplo.test', 'Reparación de electrodomésticos', 'Quillacollo', 'Lavadora industrial con ruido fuerte',
                           'Av. Ferrocarril #150, Quillacollo', 'asignada', (now() - interval '130 hours')::timestamp, (date_trunc('day', now()) + interval '0 days' + interval '8 hours 0 minutes')::timestamp, 4, false, NULL);
    p := pg_temp.postular(s, 'fernando.ortiz@ejemplo.test', 300, 'visita', 30, false, 'elegida', (now() - interval '120 hours')::timestamp);
    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente, horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (s, p, pg_temp.c('valeria.mamani@ejemplo.test'), pg_temp.c('fernando.ortiz@ejemplo.test'), 300, (date_trunc('day', now()) + interval '0 days' + interval '8 hours 0 minutes')::timestamp, (date_trunc('day', now()) + interval '0 days' + interval '12 hours 0 minutes')::timestamp, 30, (now() - interval '110 hours')::timestamp)
    RETURNING id INTO ped;
    PERFORM set_config('app.usuario_id', pg_temp.c('valeria.mamani@ejemplo.test')::text, true);
    PERFORM pg_temp.pago(ped, 'anticipo', 150, 'tarjeta', 'retenido', 0, 0, (now() - interval '70 hours')::timestamp, NULL);   -- mínimo del trabajador: Bs 150
    PERFORM pg_temp.mover(ped, pg_temp.c('valeria.mamani@ejemplo.test'), 'aprobado', NULL);
    PERFORM pg_temp.mover(ped, pg_temp.c('fernando.ortiz@ejemplo.test'), 'en_proceso', NULL);
    INSERT INTO cambio_monto (pedido_id, monto_anterior, monto_nuevo, motivo, autor_id, estado, creado_en, respondido_en)
    VALUES (ped, 300, 400, 'Hay que cambiar el motor, no solo la correa.', pg_temp.c('fernando.ortiz@ejemplo.test'),
            'aceptado', (now() - interval '3 hours')::timestamp, (now() - interval '2 hours')::timestamp);
    PERFORM set_config('app.usuario_id', pg_temp.c('valeria.mamani@ejemplo.test')::text, true);
    UPDATE pedido SET monto_vigente = 400 WHERE id = ped;

    -- D) APROBADO con un cambio de monto PENDIENTE de respuesta del cliente (empresa)
    s := pg_temp.solicitud('constructora.andina@ejemplo.test', 'Albañilería', 'Cercado', 'Remodelación completa de un baño',
                           'Av. Heroínas #900, Cercado', 'asignada', (now() - interval '140 hours')::timestamp, (date_trunc('day', now()) + interval '5 days' + interval '8 hours 0 minutes')::timestamp, 6, false, NULL);
    p := pg_temp.postular(s, 'roberto.medina@ejemplo.test', 3200, 'visita', 50, true, 'elegida', (now() - interval '130 hours')::timestamp);
    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente, horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (s, p, pg_temp.c('constructora.andina@ejemplo.test'), pg_temp.c('roberto.medina@ejemplo.test'), 3200, (date_trunc('day', now()) + interval '5 days' + interval '8 hours 0 minutes')::timestamp, (date_trunc('day', now()) + interval '5 days' + interval '14 hours 0 minutes')::timestamp, 30, (now() - interval '120 hours')::timestamp)
    RETURNING id INTO ped;
    PERFORM set_config('app.usuario_id', pg_temp.c('constructora.andina@ejemplo.test')::text, true);
    PERFORM pg_temp.pago(ped, 'anticipo', 800, 'tarjeta', 'retenido', 0, 0, (now() - interval '50 hours')::timestamp, NULL);
    PERFORM pg_temp.mover(ped, pg_temp.c('constructora.andina@ejemplo.test'), 'aprobado', NULL);
    INSERT INTO cambio_monto (pedido_id, monto_anterior, monto_nuevo, motivo, autor_id, estado, creado_en)
    VALUES (ped, 3200, 3600, 'Se encontró tubería dañada detrás de la pared.', pg_temp.c('roberto.medina@ejemplo.test'), 'pendiente', (now() - interval '5 hours')::timestamp);

    -- E) CANCELADO: anticipo reembolsado (RF-15, RF-31)
    s := pg_temp.solicitud('sofia.rojas@ejemplo.test', 'Reparación de electrodomésticos', 'Tiquipaya', 'Cocina a gas que no enciende',
                           'Calle Ayacucho #20, Tiquipaya', 'asignada', (now() - interval '160 hours')::timestamp, (date_trunc('day', now()) + interval '1 days' + interval '15 hours 0 minutes')::timestamp, 2, false, NULL);
    p := pg_temp.postular(s, 'elena.choque@ejemplo.test', 240, 'visita', 20, false, 'elegida', (now() - interval '150 hours')::timestamp);
    INSERT INTO pedido (solicitud_id, postulacion_id, cliente_id, trabajador_id, monto_vigente, horario_inicio, horario_fin, margen_minutos, creado_en)
    VALUES (s, p, pg_temp.c('sofia.rojas@ejemplo.test'), pg_temp.c('elena.choque@ejemplo.test'), 240, (date_trunc('day', now()) + interval '1 days' + interval '15 hours 0 minutes')::timestamp, (date_trunc('day', now()) + interval '1 days' + interval '17 hours 0 minutes')::timestamp, 30, (now() - interval '140 hours')::timestamp)
    RETURNING id INTO ped;
    PERFORM set_config('app.usuario_id', pg_temp.c('sofia.rojas@ejemplo.test')::text, true);
    PERFORM pg_temp.pago(ped, 'anticipo', 60, 'qr', 'reembolsado', 0, 60, (now() - interval '45 hours')::timestamp, NULL);
    PERFORM pg_temp.mover(ped, pg_temp.c('sofia.rojas@ejemplo.test'), 'aprobado', NULL);
    PERFORM pg_temp.mover(ped, pg_temp.c('sofia.rojas@ejemplo.test'), 'cancelado', 'El cliente ya no necesita el servicio.');
END $$;

-- ---------------------------------------------------------------------
-- 7. Solicitudes PENDIENTES (CU-01, CU-04): las que ven los trabajadores en "disponibles"
-- ---------------------------------------------------------------------
DO $$
DECLARE s int;
BEGIN
    -- Sacaba + Reparación: no hay trabajadores activos -> el cliente recibe el aviso de RF-16
    PERFORM pg_temp.solicitud('diego.flores@ejemplo.test', 'Reparación de electrodomésticos', 'Sacaba', 'Refrigerador que hace ruido y gotea',
                              'Calle Bolívar #310, Sacaba', 'pendiente', (now() - interval '30 hours')::timestamp, (date_trunc('day', now()) + interval '2 days' + interval '14 hours 0 minutes')::timestamp, 2, true,
                              ARRAY['https://ejemplo.arreglaloya.test/fotos/refrigerador-1.jpg']);

    s := pg_temp.solicitud('valeria.mamani@ejemplo.test', 'Albañilería', 'Cercado', 'Reparar fisuras en la pared de la sala',
                           'Av. Oquendo #310, Cercado', 'pendiente', (now() - interval '20 hours')::timestamp, (date_trunc('day', now()) + interval '2 days' + interval '9 hours 0 minutes')::timestamp, 3, true,
                           ARRAY['https://ejemplo.arreglaloya.test/fotos/pared-1.jpg', 'https://ejemplo.arreglaloya.test/fotos/pared-2.jpg']);
    PERFORM pg_temp.postular(s, 'roberto.medina@ejemplo.test', 350, 'visita', 30, false, 'enviada', (now() - interval '12 hours')::timestamp);

    s := pg_temp.solicitud('marcos.quispe@ejemplo.test', 'Reparación de electrodomésticos', 'Tiquipaya', 'Cocina eléctrica que no calienta',
                           'Av. Tiquipaya #455, Tiquipaya', 'pendiente', (now() - interval '26 hours')::timestamp, (date_trunc('day', now()) + interval '1 days' + interval '10 hours 0 minutes')::timestamp, 2, false, NULL);
    PERFORM pg_temp.postular(s, 'elena.choque@ejemplo.test', 200, 'fotos', 0, true, 'enviada', (now() - interval '18 hours')::timestamp);

    -- Tres postulaciones para que el cliente compare (HU-02)
    s := pg_temp.solicitud('laura.vargas@ejemplo.test', 'Reparación de electrodomésticos', 'Cercado', 'Lavadora que hace mucho ruido al centrifugar',
                           'Av. Heroínas #512, Cercado', 'pendiente', (now() - interval '40 hours')::timestamp, (date_trunc('day', now()) + interval '2 days' + interval '16 hours 0 minutes')::timestamp, 2, true,
                           ARRAY['https://ejemplo.arreglaloya.test/fotos/lavadora-1.jpg']);
    PERFORM pg_temp.postular(s, 'juancarlos.pinto@ejemplo.test', 250, 'visita', 20, false, 'enviada', (now() - interval '30 hours')::timestamp);
    PERFORM pg_temp.postular(s, 'pablo.ugarte@ejemplo.test', 230, 'fotos', 0, true, 'enviada', (now() - interval '28 hours')::timestamp);
    PERFORM pg_temp.postular(s, 'rosa.guzman@ejemplo.test', 270, 'visita', 25, true, 'enviada', (now() - interval '22 hours')::timestamp);

    s := pg_temp.solicitud('pedro.camacho@ejemplo.test', 'Albañilería', 'Quillacollo', 'Levantar un muro para ampliar un cuarto',
                           'Av. Martín Cárdenas #800, Quillacollo', 'pendiente', (now() - interval '50 hours')::timestamp, (date_trunc('day', now()) + interval '4 days' + interval '8 hours 0 minutes')::timestamp, 5, false, NULL);
    PERFORM pg_temp.postular(s, 'fernando.ortiz@ejemplo.test', 1800, 'visita', 50, true, 'enviada', (now() - interval '40 hours')::timestamp);

    s := pg_temp.solicitud('inmobiliaria.valle@ejemplo.test', 'Albañilería', 'Colcapirhua', 'Pintado y resane de fachada de un edificio',
                           'Av. Blanco Galindo km 7, Colcapirhua', 'pendiente', (now() - interval '60 hours')::timestamp, (date_trunc('day', now()) + interval '6 days' + interval '8 hours 0 minutes')::timestamp, 8, true, NULL);
    PERFORM pg_temp.postular(s, 'gustavo.lara@ejemplo.test', 2500, 'visita', 0, false, 'enviada', (now() - interval '48 hours')::timestamp);

    -- Una solicitud que venció a los 30 días sin aceptación (RF-24) -> «cancelada»
    PERFORM pg_temp.solicitud('andrea.salazar@ejemplo.test', 'Albañilería', 'Cercado', 'Cambiar el piso de la sala',
                              'Calle Jordán #120, Cercado', 'cancelada', (now() - interval '41 days')::timestamp,
                              (now() - interval '38 days')::timestamp, 4, false, NULL);
END $$;

-- ---------------------------------------------------------------------
-- 8. Notificaciones (RF-17): lo que el backend enviaría por WhatsApp
-- ---------------------------------------------------------------------
INSERT INTO notificacion (cuenta_id, mensaje, enviada, creada_en)
SELECT s.cliente_id, 'Nueva postulación de ' || c.nombre || ' en tu solicitud #' || s.id, (p.id % 2 = 0), p.creada_en
  FROM postulacion p
  JOIN solicitud s ON s.id = p.solicitud_id
  JOIN cuenta c    ON c.id = p.trabajador_id
 WHERE p.estado = 'enviada';

INSERT INTO notificacion (cuenta_id, pedido_id, mensaje, enviada, creada_en)
SELECT pe.trabajador_id, pe.id, 'Fuiste elegido para la solicitud #' || pe.solicitud_id || '. Pedido #' || pe.id,
       pe.estado <> 'bajo_revision', pe.creado_en
  FROM pedido pe
 WHERE pe.estado IN ('bajo_revision', 'aprobado', 'en_proceso');

-- ---------------------------------------------------------------------
-- 9. Resumen
-- ---------------------------------------------------------------------
SELECT 'cuentas' AS tabla, count(*) AS filas FROM cuenta
UNION ALL SELECT 'trabajadores', count(*) FROM trabajador
UNION ALL SELECT 'documentos', count(*) FROM documento
UNION ALL SELECT 'solicitudes', count(*) FROM solicitud
UNION ALL SELECT 'postulaciones', count(*) FROM postulacion
UNION ALL SELECT 'pedidos', count(*) FROM pedido
UNION ALL SELECT 'pagos', count(*) FROM pago
UNION ALL SELECT 'calificaciones', count(*) FROM calificacion
UNION ALL SELECT 'reportes', count(*) FROM reporte
UNION ALL SELECT 'sanciones', count(*) FROM sancion
UNION ALL SELECT 'notificaciones', count(*) FROM notificacion
UNION ALL SELECT 'bitácora', count(*) FROM bitacora;

COMMIT;
