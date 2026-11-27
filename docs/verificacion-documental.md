# Verificación documental de trabajadores

Trabajo individual en la rama `nahuel/verificacion-documental-postulaciones`.

## Funcionalidad implementada

1. El trabajador sube **identidad**, **antecedentes** y **experiencia** desde Angular como archivos reales.
2. El backend NestJS guarda el archivo bajo `UPLOADS_DIR` y su estado en la tabla PostgreSQL `documento`. Solo admite PDF, JPG y PNG de hasta 5 MB y comprueba la firma del archivo.
3. Cada documento tiene su propio estado: pendiente, aprobado u observado (el valor interno para observado es `rechazado`).
4. El administrador abre el archivo de manera autenticada y aprueba u observa. Observar exige indicar una corrección de **5 a 300 caracteres**, que queda persistida junto con la fecha y el revisor. También se crea una notificación.
5. El trabajador ve la observación en su panel y puede corregir un documento observado volviendo a subirlo; el estado vuelve a pendiente. No puede modificar documentos pendientes ni aprobados.
6. Los tres tipos aprobados permiten activar al trabajador (si no está bloqueado).
7. Las postulaciones requieren que la cuenta esté activa, sin suspensión y **que los tres tipos de documento estén aprobados en PostgreSQL**. Esto se valida en el backend incluso si se evita la interfaz Angular. La pantalla informa del bloqueo y deshabilita la acción.

## API conectada a PostgreSQL

| Acción | Endpoint | Autorización |
| --- | --- | --- |
| Mis documentos | `GET /api/trabajadores/me/documentos` | JWT |
| Subir/corregir | `POST /api/trabajadores/me/documentos` | JWT + perfil de trabajador |
| Documentos para revisar | `GET /api/admin/trabajadores/:id/documentos` | Administrador |
| Archivo privado | `GET /api/admin/documentos/:id/archivo` | Administrador |
| Aprobar | `POST /api/admin/documentos/:id/aprobar` | Administrador |
| Observar | `POST /api/admin/documentos/:id/rechazar` con `{"motivo":"Documento ilegible"}` | Administrador |
| Postularse | `POST /api/solicitudes/:id/postulaciones` | JWT + reglas documentales |

Se aprovechan las tablas existentes `documento`, `trabajador` y `notificacion`. No se requiere modificar el esquema de base del grupo. Los estados no provienen de listas estáticas ni de datos simulados.

## Cómo ejecutar y comprobar

Se necesitan la base PostgreSQL del grupo, su esquema existente y las variables de entorno del proyecto.

- En `backend/`, ejecutar `npm ci`, `npm run build`, `npm test` y `npm run start:dev`.
- En `frontend/`, ejecutar `npm ci`, `npm run build` y `npm start`.
- Crear un perfil de trabajador y subir los tres documentos de prueba **ficticios**, no datos personales reales. Verificar los estados pendientes.
- Con una cuenta administradora, aprobar identidad, observar antecedentes indicando una corrección y aprobar experiencia.
- Como trabajador, ver la observación y comprobar que la postulación está bloqueada.
- Corregir antecedentes, verificar que vuelve a pendiente, aprobarlo como administrador y comprobar que el trabajador puede postularse.
- Comprobar que archivos inválidos, demasiado grandes, documentos aprobados/pendientes y observaciones sin motivo dan errores claros.
- Refrescar la página y verificar la persistencia de estados y observaciones en PostgreSQL.

Las pruebas automáticas añadidas usan mocks para validar reglas y SQL sin necesitar datos simulados en producción. **No se afirma haber ejecutado pruebas de integración con la base de datos del grupo desde este entorno**.

## Explicación para defender ante el docente

**¿Por qué la validación de postulación está en el backend?** El usuario puede manipular el navegador. La consulta SQL es la fuente de verdad y bloquea postulaciones aunque llamen directamente a la API.

**¿Por qué verificar documentos uno por uno?** Cada documento tiene estado, motivo y fecha de revisión independientes.

**¿Por qué se usa una transacción en aprobación?** El cambio del documento, la activación y la notificación se procesan conjuntamente o ninguno se confirma.

**¿Qué es una observación?** Una corrección requerida en un documento específico. Se almacena como `rechazado` por compatibilidad con la base existente, pero es subsanable.

**¿Por qué no solo comprobar `trabajador.estado = 'activo'`?** Un estado podría quedar incoherente; se exigen además las tres aprobaciones almacenadas.

**¿Qué hace Angular?** Recupera estados reales por HTTP y envía archivos reales con `FormData`. Los errores del backend se muestran al usuario.
